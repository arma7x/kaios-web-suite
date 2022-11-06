<script lang="ts">
    import "normalize.css";
    import "purecss";

    import { onMount, onDestroy } from 'svelte';
    import { SyncProtocol } from '../../../../kaios-app/src/system/sync_protocol';

    let threads: Array<SyncProtocol.MozMobileMessageThread> = [];

    function streamEvent(evt) {
        switch (evt.detail.type) {
            case SyncProtocol.SMS_GET_THREAD:
                threads = evt.detail.data.threads;
                break;
        }
    }

    function sendSMS() {
        let recipient = prompt("Please enter recipient");
        if (recipient == null || recipient == '')
            return;
        let text = prompt("Please enter text");
        if (text == null || text == '')
            return;
        const evt = new CustomEvent(SyncProtocol.STREAM_PARENT, {
            detail: {
              type: SyncProtocol.SMS_SEND_MESSAGE_SMS,
              data: { receivers: [recipient], message: text, iccId: "" }
            }
        });
        window.dispatchEvent(evt);
    }

    onMount(() => {
        const evt = new CustomEvent(SyncProtocol.STREAM_PARENT, {
            detail: {
              type: SyncProtocol.SMS_GET_THREAD
            }
        });
        window.dispatchEvent(evt);
        window.addEventListener(SyncProtocol.STREAM_CHILD, streamEvent);
    });

    onDestroy(() => {
        window.removeEventListener(SyncProtocol.STREAM_CHILD, streamEvent);
    });

</script>

<div>
    <h2>SMS</h2>
    <button on:click={sendSMS}>Send SMS</button>
    <ul>
        {#each threads as thread}
            <li>
                <a href="#/chat/{thread.id}?data={encodeURIComponent(JSON.stringify(thread))}">{ JSON.stringify(thread) }</a>
            </li>
        {/each}
    </ul>
</div>
