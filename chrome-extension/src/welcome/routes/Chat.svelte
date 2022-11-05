<script lang="ts">
    import "normalize.css";
    import "purecss";

    import { onMount, onDestroy } from 'svelte';
    import { location } from 'svelte-spa-router';
    import { SyncProtocol } from '../../../../kaios-app/src/system/sync_protocol';

    export let params = {};

    export interface MessageIndex {
      index: number,
      message: SyncProtocol.MozSmsMessage|SyncProtocol.MozMmsMessage,
    }

    let messages: Array<SyncProtocol.MozSmsMessage|SyncProtocol.MozMmsMessage> = [];
    let messageIndex: {[key: string|number]: MessageIndex;} = {};

    function streamEvent(evt) {
        switch (evt.detail.type) {
            case SyncProtocol.SMS_GET_MESSAGES:
                if (evt.detail.data.threadId == params.threadId) {
                    evt.detail.data.messages.forEach((message, index) => {
                        messageIndex[message.id] = { index, message };
                    });
                    messages = evt.detail.data.messages;
                }
                break;
            case SyncProtocol.SMS_ON_DELIVERY_ERROR:
            case SyncProtocol.SMS_ON_DELIVERY_SUCCESS:
            case SyncProtocol.SMS_ON_RECEIVED:
            case SyncProtocol.SMS_ON_RETRIEVING:
            case SyncProtocol.SMS_ON_SENT:
            case SyncProtocol.SMS_ON_SENDING:
            case SyncProtocol.SMS_ON_FAILED:
                if (evt.detail.data.message.threadId == params.threadId) {
                    const message = evt.detail.data.message;
                    if (messageIndex[message.id] == null) {
                        messages.push(message);
                        messageIndex[message.id] = { index: messages.length - 1, message };
                    } else {
                        messageIndex[message.id].message = message;
                        messages[messageIndex[message.id].index] = messageIndex[message.id].message;
                    }
                }
                break;
            case SyncProtocol.SMS_DELETE_MESSAGE:
                evt.detail.data.request.forEach((messageId, idx) => {
                    if (messageIndex[messageId] && evt.detail.data.response[idx] == 1) {
                        const index = messageIndex[messageId].index;
                        delete messageIndex[messageId];
                        messages.splice(index, 1);
                    }
                });
                break;
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
    <ul>
        {#each messages as message}
            <li>{ JSON.stringify(message) }</li>
        {/each}
    </ul>
    <p>
        { JSON.stringify(messageIndex) }
    </p>
</div>
