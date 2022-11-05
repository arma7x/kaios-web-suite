<script lang="ts">
    import "normalize.css";
    import "purecss";

    import { onMount, onDestroy } from 'svelte';
    import { SyncProtocol } from '../../../../kaios-app/src/system/sync_protocol';

    let threads: Array<SyncProtocol.MozMobileMessageThread> = [];

    function streamEvent(evt) {
        if (evt.detail.type === SyncProtocol.SMS_GET_THREAD) {
            threads = evt.detail.data.threads;
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

<div>
    <h2>SMS</h2>
    <ul>
        {#each threads as thread}
            <li>
                <a href="#/chat/{thread.id}?data={encodeURIComponent(JSON.stringify(thread))}">{ JSON.stringify(thread) }</a>
            </li>
        {/each}
    </ul>
</div>
