<script lang="ts">
    import "normalize.css";
    import "purecss";

    import { onMount, onDestroy } from 'svelte';
    import { location } from 'svelte-spa-router';
    import { SyncProtocol } from '../../../../kaios-app/src/system/sync_protocol';

    export let params = {};

    let messages: Array<SyncProtocol.MozSmsMessage|SyncProtocol.MozMmsMessage> = [];

    function streamEvent(evt) {
        if (evt.detail.type === SyncProtocol.SMS_GET_MESSAGES && evt.detail.data.threadId === params.threadId) {
            messages = evt.detail.data.messages;
        }
    }

    onMount(() => {
        console.log('onMount CHAT', params);
        const evt = new CustomEvent(SyncProtocol.STREAM_PARENT, {
            detail: {
              type: SyncProtocol.SMS_GET_MESSAGES,
              data: { threadId: params.threadId }
            }
        });
        window.dispatchEvent(evt);
        window.addEventListener(SyncProtocol.STREAM_CHILD, streamEvent);
    });

    onDestroy(() => {
        console.log('onDestroy CHAT');
        window.removeEventListener(SyncProtocol.STREAM_CHILD, streamEvent);
    });

</script>

<div>
    <h2>Thread {params.threadId}</h2>
    <p>
        { JSON.stringify(messages) }
    </p>
</div>
