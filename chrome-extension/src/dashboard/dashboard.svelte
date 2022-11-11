<script lang="ts">
    import "normalize.css";
    import "purecss";
    import "../system/global.css";

    import { onMount, onDestroy } from 'svelte';
    import Router, { push, pop, replace } from 'svelte-spa-router';
    import QRCode from 'qr-image-generator';
    import { Peer, type DataConnection } from 'peerjs';
    import { RequestSystemStatus } from '../system/protocol';
    import { contacts, getContacts } from '../system/stores';
    import { SyncProtocol, type ContactStore } from '../../../kaios-app/src/system/sync_protocol';
    import { serverConfig } from '../../../kaios-app/src/system/config';
    import { Modals } from 'svelte-modals';

    import SMS from './routes/SMS.svelte';
    import Chat from './routes/Chat.svelte';
    import Contacts from './routes/Contacts.svelte';
    import Calendar from './routes/Calendar.svelte';
    import FileTransfer from './routes/FileTransfer.svelte';

    let peer: Peer;
    let dataConnection: DataConnection;
    let dataConnectionID: string;
    let dataConnectionStatus: bool = false;
    let isKaiOSDeviceConnected: bool = false;

    const routes = {
        '/sms': SMS,
        '/chat/:threadId': Chat,
        '/contacts': Contacts,
        '/calendar': Calendar,
        '/filetransfer': FileTransfer,
    }

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
        peer = new Peer({ debug: 0, referrerPolicy: "origin-when-cross-origin", config: serverConfig });
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
                dataConnection.send({ type: SyncProtocol.CONTACT_GET_ALL, data: { filter: {} } });
                push("#/sms");
            });
            dataConnection.on("data", (data) => {
                if (data.type === SyncProtocol.CONTACT_GET_ALL) {
                    let contactStore: ContactStore = {
                        contacts: [],
                        contactHash: {},
                        contactTelHash: {},
                    };
                    contactStore.contacts = [...data.data.contacts];
                    data.data.contacts.forEach(contact => {
                        contactStore.contactHash[contact.id] = contact;
                        contact.tel.forEach(number => {
                            contactStore.contactTelHash[number.value.replaceAll(" ", "")] = contact.id;
                            contactStore.contactTelHash[number.value] = contact.id;
                        })
                    });
                    contacts.set(contactStore);
                } else if (data.type !== SyncProtocol.PING) {
                    const evt = new CustomEvent(SyncProtocol.STREAM_DOWN, { detail: data });
                    window.dispatchEvent(evt);
                } else {
                    if (dataConnectionStatus && dataConnection && dataConnection.open) {
                        dataConnection.send({ type: SyncProtocol.PONG, data: { time: new Date().getTime() } });
                    }
                }
            });
            dataConnection.on("close", () => {
                // console.log("[MASTER] close"); // SLAVE DC
                isKaiOSDeviceConnected = false;
                broadcastConnectionStatus();
                generateQrCode();
                document.location.href = chrome.runtime.getURL('src/dashboard/dashboard.html');
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
            document.location.href = chrome.runtime.getURL('src/dashboard/dashboard.html');
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
        if (document.location.href !== chrome.runtime.getURL('src/dashboard/dashboard.html'))
            document.location.href = chrome.runtime.getURL('src/dashboard/dashboard.html');
        window.addEventListener(SyncProtocol.STREAM_UP, (evt) => {
            if (dataConnectionStatus && dataConnection && dataConnection.open) {
                dataConnection.send(evt.detail);
            }
        });
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

<div class="pure-g { isKaiOSDeviceConnected ? 'container-normal' : 'container-center' }">
    {#if !isKaiOSDeviceConnected}
        {#if dataConnectionID}
            <h1 class="container-header">KaiOS Web Suite</h1>
            <canvas id="canvas"></canvas>
        {:else}
            <h1 class="container-header">KaiOS Web Suite</h1>
            <h4>Generating QR-Code</h4>
        {/if}
    {/if}
    <div class="pure-g" style="width:80%;">
        {#if isKaiOSDeviceConnected}
        <div class="pure-u-1-5">
            <div style="width:90%;">
                <a href="#/sms" class="pure-button pure-button-primary menu">SMS</a>
                <a href="#/contacts" class="pure-button pure-button-primary menu">Contacts</a>
                <a href="#/calendar" class="pure-button pure-button-primary menu">Calendar</a>
                <a href="#/filetransfer" class="pure-button pure-button-primary menu">FileTransfer</a>
            </div>
        </div>
        {/if}
        <div class="pure-u-4-5">
            <Router {routes}/>
        </div>
    </div>
    <Modals>
      <div slot="backdrop" class="backdrop" />
    </Modals>
</div>

<style>
      .backdrop {
        position: fixed;
        top: 0;
        bottom: 0;
        right: 0;
        left: 0;
        background: rgba(0,0,0,0.50)
      }
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
    .container-normal {
        width: 100vw;
        padding: 0;
        margin: 0;
        justify-content: center;
        margin-top: 5em;
    }
    .container-center  > .container-header,
    .container-normal  > .container-header {
        text-align: center;
    }
    .menu {
        height: 100px;
        width: 100%;
        font-size: 2em;
        margin-bottom: 0.5em;
    }
</style>
