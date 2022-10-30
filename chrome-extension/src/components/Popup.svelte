<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import QRCode from 'qr-image-generator';

    let status: bool = false;

    function openWelcome() {
        const optionsUrl = chrome.runtime.getURL('src/welcome/welcome.html');
        chrome.tabs.query({url: optionsUrl}, (tabs) => {
            if (tabs.length) {
                chrome.tabs.update(tabs[0].id, {active: true});
            } else {
                chrome.tabs.create({ 'url': optionsUrl });
            }
        });
    }

    function onMessage(request, sender, sendResponse) {
        switch (request.type) {
            case 0:
                status = request.status;
                break;
            default:
                console.log("Unknown Type:", request.type);
        }
    }

    onMount(() => {
        chrome.runtime.onMessage.addListener(onMessage);
        chrome.runtime.sendMessage({ type: 0 }).catch(err => console.log(err));
    });

    onDestroy(() => {
        chrome.runtime.onMessage.removeListener(onMessage);
    });

</script>

<div class="container">
    <h2>KaiOS Web Suite</h2>
    <div>Status: { status ? 'Connected' : 'Disconnected' }</div>
    <div>
        <button on:click={openWelcome}>Open KaiOS Web Suite</button>
    </div>
</div>

<style>
    .container {
        width: 300px;
    }
</style>
