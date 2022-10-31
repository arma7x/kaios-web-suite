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

<div class="container {!isKaiOSDeviceConnected ? 'container-disconnect' : ''}">
    <h2>KaiOS Web Suite: {dataConnectionID}</h2>
</div>

<style>
    .container {
        max-width: unset;
    }
    .container-disconnect {
        height: 100vh;
        padding: 0;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>
