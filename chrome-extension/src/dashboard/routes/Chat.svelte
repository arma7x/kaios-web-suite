<script lang="ts">
    import "normalize.css";
    import "purecss";
    import "../../system/global.css";

    import { onMount, onDestroy } from 'svelte';
    import { location } from 'svelte-spa-router';
    import { SyncProtocol } from '../../../../kaios-app/src/system/sync_protocol';

    export let params = {};

    export interface MessageIndex {
      index: number,
      message: SyncProtocol.MozSmsMessage|SyncProtocol.MozMmsMessage,
    }

    let title: string = null;
    let thread: SyncProtocol.MozMobileMessageThread;
    let messages: Array<SyncProtocol.MozSmsMessage|SyncProtocol.MozMmsMessage> = [];
    let messageIndex: {[key: string|number]: MessageIndex;} = {};

    function streamEvent(evt) {
        switch (evt.detail.type) {
            case SyncProtocol.SMS_GET_MESSAGES:
                if (evt.detail.data.threadId == params.threadId) {
                    let id = [];
                    evt.detail.data.messages.forEach((message, index) => {
                        messageIndex[message.id] = { index, message };
                        id.push(message.id);
                    });
                    messages = evt.detail.data.messages;
                    readSMSMessage(id);
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
                    if (evt.detail.type === SyncProtocol.SMS_ON_RECEIVED) {
                        readSMSMessage([message.id]);
                    }
                    if (messageIndex[message.id] == null) {
                        messages.push(message);
                        messageIndex[message.id] = { index: messages.length - 1, message };
                    } else {
                        messageIndex[message.id].message = message;
                        messages[messageIndex[message.id].index] = messageIndex[message.id].message;
                    }
                    messages = [...messages];
                    messageIndex = {...messageIndex};
                }
                break;
            case SyncProtocol.SMS_DELETE_MESSAGE:
                evt.detail.data.request.forEach((messageId, idx) => {
                    if (messageIndex[messageId] && evt.detail.data.response[idx] == 1) {
                        const index = messageIndex[messageId].index;
                        messages.splice(index, 1);
                        delete messageIndex[messageId];
                        messages = [...messages];
                        messageIndex = {...messageIndex};
                    }
                });
                break;
        }
    }

    function replySMS() {
        let text = prompt("Please enter text") || 'HELP';
        const evt = new CustomEvent(SyncProtocol.STREAM_PARENT, {
            detail: {
              type: SyncProtocol.SMS_SEND_MESSAGE_SMS,
              data: { receivers: thread.participants, message: text, iccId: messages[messages.length - 1].iccId }
            }
        });
        window.dispatchEvent(evt);
    }

    function deleteSMSMessage(id: string|number) {
        const evt = new CustomEvent(SyncProtocol.STREAM_PARENT, {
            detail: {
              type: SyncProtocol.SMS_DELETE_MESSAGE,
              data: { id: [id] }
            }
        });
        window.dispatchEvent(evt);
    }

    function readSMSMessage(id: Array<string|number>) {
        const evt = new CustomEvent(SyncProtocol.STREAM_PARENT, {
            detail: {
              type: SyncProtocol.SMS_READ_MESSAGE,
              data: { id  }
            }
        });
        window.dispatchEvent(evt);
    }

    function getParameterByName(name, url = window.location.href) {
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    onMount(() => {
        const evt = new CustomEvent(SyncProtocol.STREAM_PARENT, {
            detail: {
              type: SyncProtocol.SMS_GET_MESSAGES,
              data: { threadId: params.threadId }
            }
        });
        window.dispatchEvent(evt);
        window.addEventListener(SyncProtocol.STREAM_CHILD, streamEvent);
        thread = JSON.parse(getParameterByName('data'));
        title = getParameterByName('title');
    });

    onDestroy(() => {
        window.removeEventListener(SyncProtocol.STREAM_CHILD, streamEvent);
    });

</script>

<div>
    <div style="display:flex;flex-direction:row;width:100%;justify-content:space-between;margin-bottom:1em;">
        <h1>{ title || 'Thread: ' + params.threadId }</h1>
        <button on:click={replySMS}>Reply SMS</button>
    </div>
    <div style="display:flex;flex-direction:column;width:100%;height:70vh;overflow-y:scroll;">
        {#each messages as message}
            {#if message.sender == "" }
                <div style="margin-bottom:1em;display:flex;flex-direction:row-reverse;width:100%;">
                    <div class="pure-button" style="max-width:95%;">
                        <p>{ message.body }</p>
                        <div style="display:flex;flex-direction:row;">
                            <p>{ message.delivery == "error" ? "Error" : "" }</p>
                            <small>{new Date(thread.timestamp).toLocaleString()}</small>
                            <button on:click={() => deleteSMSMessage(message.id)}>DELETE</button>
                        </div>
                    </div>
                </div>
            {:else}
                <div style="margin-bottom:1em;display:flex;flex-direction:row;width:100%;">
                    <div class="pure-button" style="max-width:95%;">
                        <p>{ message.sender }</p>
                        <p>{ message.body }</p>
                        <div style="display:flex;flex-direction:row;">
                            <p>{ message.delivery == "error" ? "Error" : "" }</p>
                            <small>{new Date(thread.timestamp).toLocaleString()}</small>
                            <button on:click={() => deleteSMSMessage(message.id)}>DELETE</button>
                        </div>
                    </div>
                </div>
            {/if}
        {/each}
    </div>
</div>

<style>
    .pure-button {
        text-align: unset;
    }
</style>
