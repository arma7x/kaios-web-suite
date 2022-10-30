<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import QRCode from 'qr-image-generator';
    import { Peer, type DataConnection } from "peerjs";

    let status: bool = false;
    let peer: Peer;
    let conn: DataConnection;

    function onMessage(request, sender, sendResponse) {
        switch (request.type) {
            case 0:
                chrome.runtime.sendMessage({ type: request.type, status: true }).catch(err => console.log(err));
                break;
            default:
                console.log("Unknown Type:", request.type);
        }
    }

    onMount(() => {
        peer = new Peer({ debug: 0, referrerPolicy: "origin-when-cross-origin" });
        chrome.runtime.onMessage.addListener(onMessage);
        chrome.runtime.sendMessage({ type: 0 }).catch(err => console.log(err));
    });

    onDestroy(() => {
        chrome.runtime.onMessage.removeListener(onMessage);
    });

</script>

<div class="container">
    <h2>KaiOS Web Suite</h2>
</div>

<style>
</style>
