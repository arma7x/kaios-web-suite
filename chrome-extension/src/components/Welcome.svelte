<script lang="ts">

    import { onMount, onDestroy } from 'svelte';

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
