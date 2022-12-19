<script lang="ts">
    import "bootstrap/dist/css/bootstrap.min.css"

    import { onMount, onDestroy } from 'svelte';
    import QRCode from 'qr-image-generator';
    import { ChromeSystemEvent } from '../system/protocol';

    let buttonVisibility: bool = false;
    let dataConnectionID: string;
    let dataConnectionStatus: bool = false;
    let isKaiOSDeviceConnected: bool = false;

    function openWelcome() {
        const optionsUrl = chrome.runtime.getURL('src/dashboard/dashboard.html');
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
            case ChromeSystemEvent.CONNECTION_STATUS:
                ({ dataConnectionID, dataConnectionStatus, isKaiOSDeviceConnected } = request.data);
                break;
            default:
                console.log("Unknown Type:", request.type);
        }
    }

    onMount(() => {
        chrome.runtime.onMessage.addListener(onMessage);
        chrome.runtime.sendMessage({ type: ChromeSystemEvent.CONNECTION_STATUS }).catch(err => console.log(err));
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
            buttonVisibility = tabs[0].url.indexOf(chrome.runtime.getURL('src/dashboard/dashboard.html')) < 0;
        });
    });

    onDestroy(() => {
        chrome.runtime.onMessage.removeListener(onMessage);
    });

</script>

<div class="container p-2 popup">
    <h3 class="mt-1 text-center">KaiOS Web Suite</h3>
    <div class="mt-1 d-flex flex-row justify-content-between">
        <div>Network Status:</div>
        <div><b>{ dataConnectionStatus ? 'Connected' : 'Disconnected' }</b></div>
    </div>
    {#if isKaiOSDeviceConnected}
        <div class="mt-1">
            <blockquote>
                <p><em>Show stats</em></p>
            </blockquote>
        </div>
    {:else}
        <div class="mt-1 d-flex flex-row justify-content-between">
            <div>KaiOS Device:</div>
            <div><b>{ isKaiOSDeviceConnected ? 'Connected' : 'Disconnected' }</b></div>
        </div>
    {/if}
    {#if buttonVisibility}
    <div class="mt-1 d-grid gap-2">
        <button class="btn btn-primary btn-sm" type="button" on:click={openWelcome}>Open KaiOS Web Suite</button>
    </div>

    {/if}
</div>

<style>
    .popup {
        min-width: 250px;
    }
</style>
