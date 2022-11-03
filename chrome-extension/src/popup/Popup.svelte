<script lang="ts">
    import "normalize.css";
    import "milligram";
    import { onMount, onDestroy } from 'svelte';
    import QRCode from 'qr-image-generator';
    import { RequestSystemStatus } from '../types/system';

    let buttonVisibility: bool = false;
    let dataConnectionID: string;
    let dataConnectionStatus: bool = false;
    let isKaiOSDeviceConnected: bool = false;

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
            case RequestSystemStatus.ConnectionStatus:
                ({ dataConnectionID, dataConnectionStatus, isKaiOSDeviceConnected } = request.data);
                break;
            default:
                console.log("Unknown Type:", request.type);
        }
    }

    onMount(() => {
        chrome.runtime.onMessage.addListener(onMessage);
        chrome.runtime.sendMessage({ type: RequestSystemStatus.ConnectionStatus }).catch(err => console.log(err));
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
            buttonVisibility = tabs[0].url.indexOf(chrome.runtime.getURL('src/welcome/welcome.html')) < 0;
        });
    });

    onDestroy(() => {
        chrome.runtime.onMessage.removeListener(onMessage);
    });

</script>

<div class="container column">
    <h3 style="text-align:center;margin-bottom:0.1em;">KaiOS Web Suite</h3>
    <div style="display:flex;flex-direction:row;justify-content:space-between;">
        <div>Network Status:</div>
        <div><b>{ dataConnectionStatus ? 'Connected' : 'Disconnected' }</b></div>
    </div>
    {#if isKaiOSDeviceConnected}
        <blockquote>
            <p><em>Show stats</em></p>
        </blockquote>
    {:else}
        <div style="display:flex;flex-direction:row;justify-content:space-between;">
            <div>KaiOS Device:</div>
            <div><b>{ isKaiOSDeviceConnected ? 'Connected' : 'Disconnected' }</b></div>
        </div>
    {/if}
    {#if buttonVisibility}
    <div style="display:flex;justify-content:space-around;margin-top:0.1em;">
        <button style="width:100%;" on:click={openWelcome}>Open KaiOS Web Suite</button>
    </div>
    {/if}
</div>

<style>
    .container {
        margin: 1em 0;
        width: 280px;
    }
</style>
