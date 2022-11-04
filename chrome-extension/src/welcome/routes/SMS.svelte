<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { SyncProtocol } from '../../../../kaios-app/src/system/sync_protocol';

    let threads: Array<SyncProtocol.MozSmsMessage|SyncProtocol.MozMmsMessage> = [];

    function streamEvent(evt) {
        if (evt.detail.type === SyncProtocol.SMS_GET_THREAD) {
            threads = evt.detail.data.threads;
            console.log(threads);
        }
    }

    onMount(() => {
        console.log('onMount SMS');
        const evt = new CustomEvent(SyncProtocol.STREAM_PARENT, {
            detail: {
              type: SyncProtocol.SMS_GET_THREAD
            }
        });
        window.dispatchEvent(evt);
        window.addEventListener(SyncProtocol.STREAM_CHILD, streamEvent);
    });

    onDestroy(() => {
        console.log('onDestroy SMS');
        window.removeEventListener(SyncProtocol.STREAM_CHILD, streamEvent);
    });

</script>

<h2>SMS</h2>
<p>
    { JSON.stringify(threads) }
</p>
