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
    let fileRef;

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
        return;
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

    function toggleMessageType() {
        if (type === MessageType.SMS)
            type = MessageType.MMS;
        else
            type = MessageType.SMS;
    }

    function removeAttachment(index: number) {
        attachments.splice(index, 1);
        attachments = [...attachments];
    }

    function onFileSelected(evt) {
        if (evt.target.files.length > 0) {
            const file = evt.target.files[0];
            let text = prompt("Enter caption text for attachment(optional)") || "";
            let attachment = { name: file.name, blob: file };
            if (text && text != "")
                attachment['text'] = text;
            attachments = [...attachments, attachment];
        }
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
        type = thread.lastMessageType;
        subject = thread.lastMessageSubject;
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
    <div class="reply-container">
        {#if type == MessageType.MMS }
            <input type="text" placeholder="Subject" bind:value={subject}/>
        {/if}
        <div class="bottom">
            <div class="input">
                <textarea placeholder="Enter your message here" bind:value={message}></textarea>
                {#if type == MessageType.MMS }
                    <div class="attachment-container">
                        {#each attachments as attachment, i}
                            <div class="attachment-item">
                                <div class="attachment-label">
                                    {attachment.name}
                                    {#if attachment.text && attachment.text != ""}
                                        ({attachment.text})
                                    {/if}
                                </div>
                                <button class="pure-button" on:click={() => removeAttachment(i)}>Remove</button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
            <div class="toolbox">
                <button class="pure-button" style="margin-bottom:1em;" on:click={toggleMessageType}>Mode: {type.toUpperCase()}</button>
                {#if type == MessageType.MMS }
                    <button class="pure-button" style="margin-bottom:1em;" on:click={()=>{fileRef.click()}}>Add Attachment</button>
                {/if}
                {#if thread && thread.participants.length > 0 && (type == MessageType.SMS ? message != "" : (message != "" || attachments.length > 0)) }
                    <button class="pure-button" style="margin-bottom:1em;" on:click={replyMessage}>Send</button>
                {/if}
            </div>
        </div>
    </div>
    <input bind:this={fileRef} style="display:none" type="file" accept=".jpg, .jpeg, .png, .mp4" on:change={onFileSelected} />
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
    }
    .reply-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 20vh;
    }
    .reply-container > input {
        height: 30px;
        width: 100%;
    }
    .reply-container > .bottom {
        display: flex;
        flex-direction: row;
        margin-top: 1em;
    }
    .reply-container > .bottom > .input {
        width: 85%;
    }
    .reply-container > .bottom > .input > textarea {
        width: 98%;
        height: 60px;
        resize: vertical;
    }
    .reply-container > .bottom > .input > .attachment-container {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
    }
    .reply-container > .bottom > .input > .attachment-container > .attachment-item {
        margin: 1em 0.5em 0 0;
        display: flex;
        flex-direction: row;
        align-items: center;
    }
    .reply-container > .bottom > .input > .attachment-container > .attachment-item > .attachment-label {
        margin-right: 0.5em;
    }
    .reply-container > .bottom > .toolbox {
        width: 15%;
        display: flex;
        flex-direction: column;
    }
</style>
