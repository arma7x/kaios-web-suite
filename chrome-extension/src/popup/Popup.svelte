<script lang="ts">
    import "normalize.css";
    import "purecss";
    import { onMount, onDestroy } from 'svelte';
    import QRCode from 'qr-image-generator';
    import { RequestSystemStatus } from '../system/protocol';

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
            buttonVisibility = tabs[0].url.indexOf(chrome.runtime.getURL('src/dashboard/dashboard.html')) < 0;
        });
    });

    onDestroy(() => {
        chrome.runtime.onMessage.removeListener(onMessage);
    });

</script>

<div class="pure-g container">
    <div class="pure-u">
        <h1 style="text-align:center;margin:0em;">KaiOS Web Suite</h1>
    </div>
    <div class="pure-u" style="display:flex;flex-direction:row;justify-content:space-between;">
        <div>Network Status:</div>
        <div><b>{ dataConnectionStatus ? 'Connected' : 'Disconnected' }</b></div>
    </div>
    {#if isKaiOSDeviceConnected}
        <div class="pure-u">
            <blockquote>
                <p><em>Show stats</em></p>
            </blockquote>
        </div>
    {:else}
        <div class="pure-u" style="display:flex;flex-direction:row;justify-content:space-between;">
            <div>KaiOS Device:</div>
            <div><b>{ isKaiOSDeviceConnected ? 'Connected' : 'Disconnected' }</b></div>
        </div>
    {/if}
    {#if buttonVisibility}
    <div class="pure-u" style="display:flex;justify-content:space-around;">
        <button class="pure-button pure-button-primary" style="width:100%;" on:click={openWelcome}>Open KaiOS Web Suite</button>
    </div>
    {/if}
</div>

<style>
    .container {
        margin: 1em;
        min-width: 200px;
        display: flex;
        flex-direction: column;
    }
</style>
