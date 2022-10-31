<script lang="ts">
    import "normalize.css";
    import "milligram";
    import { onMount, onDestroy } from 'svelte';
    import QRCode from 'qr-image-generator';
    import { Peer, type DataConnection } from 'peerjs';
    import { RequestSystemStatus } from '../types/system';

    let peer: Peer;
    let dataConnection: DataConnection;
    let dataConnectionID: string;
    let dataConnectionStatus: bool = false;
    let isKaiOSDeviceConnected: bool = false;

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
            console.log("[MASTER] open", dataConnectionID, dataConnectionStatus);
            broadcastConnectionStatus();
            generateQrCode();
        });
        // SLAVE CONNECTED TO MASTER
        peer.on("connection", (conn) => {
            console.log("[MASTER] connection");
            dataConnection = conn;
            dataConnection.on("open", () => {
                console.log("[MASTER] open");
                console.log("[MASTER] Send Ping");
                dataConnection.send("Ping from master");
                isKaiOSDeviceConnected = true;
                broadcastConnectionStatus();
            });
            dataConnection.on("data", (data) => {
                console.log("[MASTER] recv data:", data);
            });
            dataConnection.on("close", () => {
                console.log("[MASTER] close"); // SLAVE DC
                isKaiOSDeviceConnected = false;
                broadcastConnectionStatus();
                generateQrCode();
            });
            dataConnection.on("error", (err) => {
                console.log("[MASTER] error", err);
            });
        });
        peer.on("disconnected", () => {
            console.log("[MASTER] disconnected");
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
            if (dataConnection) {
                dataConnection.close();
                dataConnection = null;
            }
            peer.destroy();
            peer.disconnect();
            peer = null;
        }
    });

</script>

<div class="container container-center">
    <h2 class="container-header">KaiOS Web Suite</h2>
    {#if dataConnectionID}
        {#if !isKaiOSDeviceConnected}
            <h4>{dataConnectionID}</h4>
            <canvas id="canvas"></canvas>
        {:else}
            <div class="container">
                <div class="row">
                    <button class="column column-25 button button-outline" style="margin:0.1em;">SMS</button>
                    <button class="column column-25 button button-outline" style="margin:0.1em;">Contacts</button>
                    <button class="column column-25 button button-outline" style="margin:0.1em;">Foo</button>
                    <button class="column column-25 button button-outline" style="margin:0.1em;">Bar</button>
                </div>
            </div>
        {/if}
    {:else}
        <h4>Generating QR-Code</h4>
    {/if}
</div>

<style>
    .container.container-center {
        height: 100vh;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        max-width: unset;
    }
    .container.container-center  > .container-header {
        text-align: center;
    }
    .container.container-center  > .container > .row > button {
        font-weight: bold;
        font-size: 1.5em;
    }
</style>
