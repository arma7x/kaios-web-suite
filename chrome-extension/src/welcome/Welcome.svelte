<script lang="ts">
    import "normalize.css";
    import "purecss";
    import { onMount, onDestroy } from 'svelte';
    import QRCode from 'qr-image-generator';
    import { Peer, type DataConnection } from 'peerjs';
    import { RequestSystemStatus } from '../types/system';
    import { SyncProtocol } from '../../../kaios-app/src/system/sync_protocol';

    let peer: Peer;
    let dataConnection: DataConnection;
    let dataConnectionID: string;
    let dataConnectionStatus: bool = false;
    let isKaiOSDeviceConnected: bool = false;

    let threads: any = [];

    function onMessage(request, sender, sendResponse) {
        switch (request.type) {
            case 0:
                broadcastConnectionStatus();
                if (dataConnectionStatus == false) {
                    setupPeer();
                }
                break;
            default:
                console.log("Unknown Type:", request.type);
        }
    }

    function setupPeer() {
        peer = new Peer({ debug: 0, referrerPolicy: "origin-when-cross-origin" });
        peer.on("open", (id) => {
            dataConnectionStatus = true;
            dataConnectionID = id;
            // console.log("[MASTER] open", dataConnectionID, dataConnectionStatus);
            broadcastConnectionStatus();
            generateQrCode();
        });
        // SLAVE CONNECTED TO MASTER
        peer.on("connection", (conn) => {
            // console.log("[MASTER] connection");
            dataConnection = conn;
            dataConnection.on("open", () => {
                // console.log("[MASTER] open");
                isKaiOSDeviceConnected = true;
                broadcastConnectionStatus();
                dataConnection.send({ type: SyncProtocol.SMS_GET_THREAD });
            });
            dataConnection.on("data", (data) => {
                switch (data.type) {
                    case SyncProtocol.PING:
                        if (dataConnectionStatus && dataConnection && dataConnection.open) {
                            dataConnection.send({ type: SyncProtocol.PONG, data: { time: new Date().getTime() } });
                        }
                        break;
                    case SyncProtocol.SMS_GET_THREAD:
                        threads = data.data.threads;
                        console.log(data.type, threads);
                        break;
                    case SyncProtocol.SMS_GET_MESSAGES:
                        console.log(data.type, data.data.messages);
                        break;
                    case SyncProtocol.SMS_DELETE_MESSAGE:
                        console.log(data.type, data.data);
                        break;
                    case SyncProtocol.SMS_SMSC_ADDRESS:
                        console.log(data.type, data.data);
                    default:
                        console.log("Unknown :", data);
                }
            });
            dataConnection.on("close", () => {
                // console.log("[MASTER] close"); // SLAVE DC
                isKaiOSDeviceConnected = false;
                broadcastConnectionStatus();
                generateQrCode();
            });
            dataConnection.on("error", (err) => {
                console.log("[MASTER] error", err);
            });
        });
        peer.on("disconnected", () => {
            // console.log("[MASTER] disconnected");
            dataConnectionID = null;
            dataConnectionStatus = false;
            isKaiOSDeviceConnected = false;
            broadcastConnectionStatus();
        });
    }

    function broadcastConnectionStatus() {
        chrome.runtime.sendMessage({
            type: RequestSystemStatus.ConnectionStatus,
            data: {
                dataConnectionID,
                dataConnectionStatus,
                isKaiOSDeviceConnected
            }
        })
        .catch(err => console.log(err));
    }

    function generateQrCode() {
        const opts = {
          errorCorrectionLevel: 'H',
          type: 'image/jpeg',
          quality: 1,
          margin: 1,
          width: 300
        }
        setTimeout(() => {
            const canvas = document.getElementById('canvas');
            QRCode.toCanvas(canvas, dataConnectionID, opts, (error) => {
              if (error) console.error(error)
            });
        }, 100);
    }


    function getSMSMessages(threadId: string|number) {
        if (dataConnectionStatus && dataConnection && dataConnection.open) {
            dataConnection.send({
                type: SyncProtocol.SMS_GET_MESSAGES,
                data: { threadId }
            });
        }
    }

    function testGetSMSMessages() {
        const id = prompt("Enter thread id").trim();
        if (id && id != '') {
            getSMSMessages(id);
        } else {
            console.log("Invalid Thread ID");
        }
    }

    function sendSMSMessage(receivers: string[], message: string, iccId: string) {
        if (dataConnectionStatus && dataConnection && dataConnection.open) {
            dataConnection.send({
                type: SyncProtocol.SMS_SEND_MESSAGE_SMS,
                data: { receivers, message, iccId }
            });
        }
    }

    function testSendSMSMessage() {
        sendSMSMessage(["20505"], "HELP", "");
    }

    function readSMSMessage(id: Array<string|number>) {
        if (dataConnectionStatus && dataConnection && dataConnection.open) {
            dataConnection.send({
                type: SyncProtocol.SMS_READ_MESSAGE,
                data: { id }
            });
        }
    }

    function testReadSMSMessage() {
        const id = prompt("Enter message id").trim();
        if (id && id != '') {
            readSMSMessage([id]);
        } else {
            console.log("Invalid Message ID");
        }
    }

    function deleteSMSMessage(id: Array<string|number>) {
        if (dataConnectionStatus && dataConnection && dataConnection.open) {
            dataConnection.send({
                type: SyncProtocol.SMS_DELETE_MESSAGE,
                data: { id }
            });
        }
    }

    function testDeleteSMSMessage() {
        const id = prompt("Enter message id").trim();
        if (id && id != '') {
            deleteSMSMessage(id.split(','));
        } else {
            console.log("Invalid Message ID");
        }
    }

    function testContact() {
        if (dataConnectionStatus && dataConnection && dataConnection.open) {
            console.log("run testContact");
            const filter = {
              filterBy: ['id'],
              filterValue: 'f4f790cbc5c5498d8f845d031dd8d567',
              filterOp: 'match',
              filterLimit: 1
            };
            dataConnection.send({ type: SyncProtocol.CONTACT_FIND, data: { filter } });
            dataConnection.send({ type: SyncProtocol.CONTACT_GET_ALL });
            dataConnection.send({ type: SyncProtocol.CONTACT_GET_COUNT });
            dataConnection.send({ type: SyncProtocol.CONTACT_GET_REVISION });
        }
    }

    function getSmscAddress() {
        if (dataConnectionStatus && dataConnection && dataConnection.open) {
            dataConnection.send({
                type: SyncProtocol.SMS_SMSC_ADDRESS
            });
        }
    }

    onMount(() => {
        chrome.runtime.onMessage.addListener(onMessage);
        broadcastConnectionStatus();
        if (dataConnectionStatus == false) {
            setupPeer();
        }
    });

    onDestroy(() => {
        chrome.runtime.onMessage.removeListener(onMessage);
        if (peer) {
            if (dataConnection && dataConnection.open) {
                dataConnection.close();
                dataConnection = null;
            }
            peer.destroy();
            peer.disconnect();
            peer = null;
        }
    });

</script>

<div class="pure-g container-center">
    <h1 class="container-header">KaiOS Web Suite</h1>
    {#if dataConnectionID}
        {#if !isKaiOSDeviceConnected}
            <canvas id="canvas"></canvas>
        {:else}
            <div class="pure-g">
                <div class="row">
                    <button class="pure-button">SMS</button>
                    <button class="pure-button">Contacts</button>
                    <button class="pure-button">Calendar</button>
                    <button class="pure-button">File Manager</button>
                </div>
                <div class="row">
                    <button class="pure-button" on:click={testGetSMSMessages}>TEST GET MESSAGES</button>
                    <button class="pure-button" on:click={testSendSMSMessage}>TEST SEND SMS</button>
                    <button class="pure-button" on:click={testReadSMSMessage}>TEST READ SMS</button>
                    <button class="pure-button" on:click={testDeleteSMSMessage}>TEST DELETE SMS</button>
                </div>
                <div class="row">
                    <button class="pure-button" on:click={testContact}>TEST CONTACT</button>
                    <button class="pure-button" on:click={getSmscAddress}>TEST SMSC ADDRESS</button>
                </div>
            </div>
        {/if}
    {:else}
        <h4>Generating QR-Code</h4>
    {/if}
</div>

<style>
    .container-center {
        max-width: unset;
        flex-flow: unset;
        align-content: unset;
        height: 100vh;
        width: 100vw;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;

    }
    .container-center  > .container-header {
        text-align: center;
    }
    .container-center  > .pure-g > .row > button {
        font-weight: bold;
        font-size: 1.5em;
        margin: 0.1em;
    }
</style>
