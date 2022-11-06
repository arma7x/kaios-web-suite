<script lang="ts">
    import "normalize.css";
    import "purecss";
    import "../../system/global.css";

    import { onMount, onDestroy } from 'svelte';
    import { location } from 'svelte-spa-router';
    import { SyncProtocol, MessageType } from '../../../../kaios-app/src/system/sync_protocol';
    import MozSmsMessage from '../widgets/MozSmsMessage.svelte';
    import MozMmsMessage from '../widgets/MozMmsMessage.svelte';
    import { contacts as contactsDataStore, getContacts as getContactsDataStore } from '../../system/stores';

    export let params = {};

    export interface MessageIndex {
      index: number,
      message: SyncProtocol.MozSmsMessage|SyncProtocol.MozMmsMessage,
    }

    let title: string = null;
    let thread: SyncProtocol.MozMobileMessageThread;
    let messages: Array<SyncProtocol.MozSmsMessage|SyncProtocol.MozMmsMessage> = [];
    let messageIndex: {[key: string|number]: MessageIndex;} = {};

    let contactsUnsubscribe: any;
    let contactHash: {[key: string|number]: SyncProtocol.MozContact;} = {};
    let contactTelHash: {[key: string|number]: string|number;} = {};

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

    function resolveMessageWidget(msg: SyncProtocol.MozSmsMessage|SyncProtocol.MozMmsMessage) {
        if (msg.type == MessageType.SMS) {
            return MozSmsMessage;
        }
        return MozMmsMessage;
    }

    function indexContact(contactStore: SyncProtocol.ContactStore = {}) {
        if (contactStore.contactHash)
            contactHash = {...contactStore.contactHash};
        if (contactStore.contactTelHash)
            contactTelHash = {...contactStore.contactTelHash};
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
        indexContact(getContactsDataStore());
        contactsUnsubscribe = contactsDataStore.subscribe((contactStore: SyncProtocol.ContactStore = {}) => {
            indexContact(contactStore);
        });
    });

    onDestroy(() => {
        window.removeEventListener(SyncProtocol.STREAM_CHILD, streamEvent);
        if (contactsUnsubscribe)
            contactsUnsubscribe();
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
                    <svelte:component this={resolveMessageWidget(message)} showSender={false} senderName="" message={message} deleteCallback={deleteSMSMessage} />
                </div>
            {:else}
                <div style="margin-bottom:1em;display:flex;flex-direction:row;width:100%;">
                    <svelte:component this={resolveMessageWidget(message)} showSender={thread.participants.length > 1} senderName={contactTelHash[message.sender] ? contactHash[contactTelHash[message.sender]].name[0] : message.sender} message={message} deleteCallback={deleteSMSMessage} />
                </div>
            {/if}
        {/each}
    </div>
</div>

<style>
</style>
