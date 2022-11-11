<script lang="ts">
    import "normalize.css";
    import "purecss";
    import "../../system/global.css";

    import { onMount, onDestroy } from 'svelte';
    import { location } from 'svelte-spa-router';
    import { SyncProtocol, MessageType, type MozSmsMessage, type MozMmsMessage, type MozMobileMessageThread, type MozContact, type ContactStore, type FileAttachment } from '../../../../kaios-app/src/system/sync_protocol';
    import MozSmsMessageWidget from '../widgets/MozSmsMessage.svelte';
    import MozMmsMessageWidget from '../widgets/MozMmsMessage.svelte';
    import { contacts as contactsDataStore, getContacts as getContactsDataStore } from '../../system/stores';
    import SMIL from '../../system/smil';
    import { openModal } from 'svelte-modals';
    import SendMessageWidget from '../widgets/SendMessage.svelte';

    export let params = {};

    export interface MessageIndex {
      index: number,
      message: MozSmsMessage|MozMmsMessage,
    }

    let chatContainerRef: any;
    let title: string = null;
    let thread: MozMobileMessageThread;
    let messages: Array<MozSmsMessage|MozMmsMessage> = [];
    let messageIndex: {[key: string|number]: MessageIndex;} = {};

    let contactsUnsubscribe: any;
    let contactHash: {[key: string|number]: MozContact;} = {};
    let contactTelHash: {[key: string|number]: string|number;} = {};

    let type: MessageType = MessageType.SMS;

    let subject: string = "";
    let message: string = "";
    let attachments: Array<FileAttachment> = [];

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
                    scrollBottom();
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
                    scrollBottom();
                }
                break;
            case SyncProtocol.SMS_DELETE_MESSAGE:
                evt.detail.data.request.forEach((messageId, idx) => {
                    if (messageIndex[messageId] && evt.detail.data.response[idx] == 1) {
                        const index = messageIndex[messageId].index;
                        messages.splice(index, 1);
                        delete messageIndex[messageId];
                        messages = [...messages];
                        messages.forEach((message, index) => {
                            messageIndex[message.id] = { index, message };
                        });
                        messageIndex = {...messageIndex};
                    }
                });
                break;
        }
    }

    function scrollBottom() {
        setTimeout(() => {
            chatContainerRef.scrollTop = chatContainerRef.scrollHeight;
        }, 500);
    }

    function replyMessage() {
        console.log(thread);
        let text = prompt("Please enter text") || 'HELP';
        const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
            detail: {
              type: SyncProtocol.SMS_SEND_MESSAGE_SMS,
              data: { receivers: thread.participants, message: text, iccId: messages[messages.length - 1].iccId }
            }
        });
        window.dispatchEvent(evt);
    }

    function deleteSMSMessage(id: string|number) {
        if (confirm("Are you sure to delete this message ?")) {
            const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
                detail: {
                  type: SyncProtocol.SMS_DELETE_MESSAGE,
                  data: { id: [id] }
                }
            });
            window.dispatchEvent(evt);
        }
    }

    function readSMSMessage(id: Array<string|number>) {
        const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
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

    function resolveMessageWidget(msg: MozSmsMessage|MozMmsMessage) {
        if (msg.type == MessageType.SMS) {
            return MozSmsMessageWidget;
        }
        return MozMmsMessageWidget;
    }

    function indexContact(contactStore: ContactStore = {}) {
        if (contactStore.contactHash)
            contactHash = {...contactStore.contactHash};
        if (contactStore.contactTelHash)
            contactTelHash = {...contactStore.contactTelHash};
    }

    onMount(() => {
        const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
            detail: {
              type: SyncProtocol.SMS_GET_MESSAGES,
              data: { threadId: params.threadId }
            }
        });
        window.dispatchEvent(evt);
        window.addEventListener(SyncProtocol.STREAM_DOWN, streamEvent);
        thread = JSON.parse(getParameterByName('data'));
        title = getParameterByName('title');
        indexContact(getContactsDataStore());
        contactsUnsubscribe = contactsDataStore.subscribe((contactStore: ContactStore = {}) => {
            indexContact(contactStore);
        });
    });

    onDestroy(() => {
        window.removeEventListener(SyncProtocol.STREAM_DOWN, streamEvent);
        if (contactsUnsubscribe)
            contactsUnsubscribe();
    });

</script>

<div>
    <div class="header-container">
        <h1>{ title || 'Thread: ' + params.threadId }</h1>
        <button on:click={replyMessage}>Reply</button>
    </div>
    <div bind:this={chatContainerRef} class="chat-container">
        {#each messages as message}
            {#if message.sender == "" }
                <div class="right">
                    <svelte:component this={resolveMessageWidget(message)} showSender={false} senderName="" message={message} deleteCallback={deleteSMSMessage} />
                </div>
            {:else}
                <div class="left">
                    <svelte:component this={resolveMessageWidget(message)} showSender={thread.participants.length > 1} senderName={contactTelHash[message.sender] ? contactHash[contactTelHash[message.sender]].name[0] : message.sender} message={message} deleteCallback={deleteSMSMessage} />
                </div>
            {/if}
        {/each}
    </div>
</div>

<style>
    .header-container {
        display: flex;
        flex-direction: row;
        width: 100%;
        justify-content: space-between;
        margin-bottom: 1em;
    }
    .chat-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 70vh;
        overflow-y: scroll;
    }
    .chat-container > .right {
        margin-bottom: 1em;
        display: flex;
        flex-direction: row-reverse;
        width: 100%;
    }
    .chat-container > .left {
        margin-bottom: 1em;
        display: flex;
        flex-direction: row;
        width: 100%;
    }
</style>
