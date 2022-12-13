<script lang="ts">
    import "bootstrap/dist/css/bootstrap.min.css"

    import { onMount, onDestroy } from 'svelte';
    import Router, { push, pop, replace } from 'svelte-spa-router';
    import QRCode from 'qr-image-generator';
    import { Peer, type DataConnection } from 'peerjs';
    import { ChromeSystemEvent } from '../system/protocol';
    import { contactStorage } from '../system/stores';
    import { SyncProtocol, type ContactStore } from '../../../kaios-app/src/system/sync_protocol';
    import { Modals, closeModal } from 'svelte-modals'

    import SMS from './routes/SMS.svelte';
    import Chat from './routes/Chat.svelte';
    import { CardDAVContacts, KaiOSContacts, SyncContact } from './routes/contacts';
    import Calendar from './routes/Calendar.svelte';
    import FileTransfer from './routes/FileTransfer.svelte';
    import Settings from './routes/Settings.svelte';

    let peer: Peer;
    let dataConnection: DataConnection;
    let dataConnectionID: string;
    let dataCONNECTION_STATUS: bool = false;
    let isKaiOSDeviceConnected: bool = false;
    let showQrCode: bool = true;

    const routes = {
        '/sms': SMS,
        '/chat/:threadId': Chat,
        '/card-dav-contacts': CardDAVContacts,
        '/kaios-contacts': KaiOSContacts,
        '/sync-contacts': SyncContact,
        '/calendar': Calendar,
        '/filetransfer': FileTransfer,
        '/settings': Settings,
    }

    function onMessage(request, sender, sendResponse) {
        switch (request.type) {
            case ChromeSystemEvent.CONNECTION_STATUS:
                broadcastCONNECTION_STATUS();
                if (dataCONNECTION_STATUS == false) {
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
            dataCONNECTION_STATUS = true;
            dataConnectionID = id;
            // console.log("[MASTER] open", dataConnectionID, dataCONNECTION_STATUS);
            broadcastCONNECTION_STATUS();
            generateQrCode();
        });
        // SLAVE CONNECTED TO MASTER
        peer.on("connection", (conn) => {
            // console.log("[MASTER] connection");
            dataConnection = conn;
            dataConnection.on("open", () => {
                // console.log("[MASTER] open");
                isKaiOSDeviceConnected = true;
                broadcastCONNECTION_STATUS();
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
                    contactStorage.set(contactStore);
                } else if (data.type !== SyncProtocol.PING) {
                    const evt = new CustomEvent(SyncProtocol.STREAM_DOWN, { detail: data });
                    window.dispatchEvent(evt);
                    if (data.type === SyncProtocol.SMS_ON_RECEIVED) {
                        let notification: bool = false;
                        if (document.visibilityState === 'visible') {
                            const hashes = document.location.hash.split('/');
                            if (hashes[1] !== 'chat') {
                                notification = true;
                            } else {
                                if (parseInt(hashes[2].substring(0, hashes[2].indexOf('?'))) != data.data.message.threadId) {
                                    notification = true;
                                } else {
                                    // ding
                                }
                            }
                        } else {
                            notification = true;
                        }
                        if (notification) {
                            chrome.notifications.create('', {
                                title: data.data.message.type.toUpperCase(),
                                message: `You have received new ${data.data.message.type}`,
                                iconUrl: '/src/assets/icons/get_started128.png',
                                type: 'basic'
                            });
                        }
                    }
                } else {
                    if (dataCONNECTION_STATUS && dataConnection && dataConnection.open) {
                        dataConnection.send({ type: SyncProtocol.PONG, data: { time: new Date().getTime() } });
                    }
                }
            });
            dataConnection.on("close", () => {
                // console.log("[MASTER] close"); // SLAVE DC
                isKaiOSDeviceConnected = false;
                broadcastCONNECTION_STATUS();
                generateQrCode();
                document.location.href = chrome.runtime.getURL('src/dashboard/dashboard.html');
            });
            dataConnection.on("error", (err) => {
                console.log("[MASTER] error", err);
            });
        });
        peer.on("disconnected", () => {
            // console.log("[MASTER] disconnected");
            // dataConnectionID = null;
            // dataCONNECTION_STATUS = false;
            // isKaiOSDeviceConnected = false;
            // broadcastCONNECTION_STATUS();
            // document.location.href = chrome.runtime.getURL('src/dashboard/dashboard.html');
        });
    }

    function broadcastCONNECTION_STATUS() {
        chrome.runtime.sendMessage({
            type: ChromeSystemEvent.CONNECTION_STATUS,
            data: {
                dataConnectionID,
                dataCONNECTION_STATUS,
                isKaiOSDeviceConnected
            }
        })
        .catch(err => console.log(err));
        const evt = new CustomEvent(ChromeSystemEvent.STREAM_DOWN, {
            detail: {
                type: ChromeSystemEvent.CONNECTION_STATUS,
                data: {
                    dataConnectionID,
                    dataCONNECTION_STATUS,
                    isKaiOSDeviceConnected
                }
            }
        });
        window.dispatchEvent(evt);
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

    window.addEventListener('hashchange', (evt) => {
        if (['', '#/'].indexOf(new URL(evt.newURL).hash) > -1)
            showQrCode = true;
        else
            showQrCode = false;
    });

    onMount(() => {
        chrome.runtime.onMessage.addListener(onMessage);
        broadcastCONNECTION_STATUS();
        if (dataCONNECTION_STATUS == false) {
            setupPeer();
        }
        if (document.location.href !== chrome.runtime.getURL('src/dashboard/dashboard.html'))
            document.location.href = chrome.runtime.getURL('src/dashboard/dashboard.html');
        window.addEventListener(SyncProtocol.STREAM_UP, (evt) => {
            if (dataCONNECTION_STATUS && dataConnection && dataConnection.open) {
                dataConnection.send(evt.detail);
            }
        });
        window.addEventListener(ChromeSystemEvent.STREAM_UP, (evt) => {
            switch (evt.detail.type) {
                case ChromeSystemEvent.CONNECTION_STATUS:
                    broadcastCONNECTION_STATUS();
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

<div class="mt-5 col-10 offset-1">
    <div class="row">
        <div class="col-2">
            <div class="mt-2 d-grid gap-2">
                {#if !isKaiOSDeviceConnected}
                    <a href="#/" class="btn btn-primary btn-sm">Link Device</a>
                {:else}
                    <a href="#/sms" class="btn btn-primary btn-sm">SMS</a>
                    <a href="#/kaios-contacts" class="btn btn-primary btn-sm">KaiOS Contacts</a>
                    <a href="#/sync-contacts" class="btn btn-primary btn-sm">Sync Contacts</a>
                {/if}
                <a href="#/card-dav-contacts" class="btn btn-primary btn-sm">CardDAV Contacts</a>
                <!-- <a href="#/calendar" class="btn btn-primary btn-sm">Calendar</a> -->
                {#if isKaiOSDeviceConnected && false}
                    <a href="#/filetransfer" class="btn btn-primary btn-sm">File Transfer</a>
                {/if}
                <a href="#/settings" class="btn btn-primary btn-sm">Settings</a>
            </div>
        </div>
        <div class="col-10">
            <Router {routes}/>
            <div class="qr-container {showQrCode ? 'd-flex' : 'd-none'}">
                <h1 class="container-header">KaiOS Web Suite</h1>
                {#if dataConnectionID}
                    <canvas id="canvas"></canvas>
                {:else}
                    <h4>Generating QR-Code</h4>
                {/if}
            </div>
        </div>
    </div>
    <Modals>
        <div slot="backdrop" class="backdrop" on:click={closeModal}/>
    </Modals>
</div>

<style>
    .qr-container {
        max-width: unset;
        flex-flow: unset;
        align-content: unset;
        height: calc(100vh - 5em);
        width: 100%;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
    .qr-container  > .container-header {
        text-align: center;
    }
</style>
