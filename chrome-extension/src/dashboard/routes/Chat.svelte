<script lang="ts">
    import "../../system/global.css";

    import { onMount, onDestroy } from 'svelte';
    import { location } from 'svelte-spa-router';
    import { SyncProtocol, MessageType, type MozSmsMessage, type MozMmsMessage, type MozMobileMessageThread, type MozContact, type ContactStore, type FileAttachment } from '../../../../kaios-app/src/system/sync_protocol';
    import MozSmsMessageWidget from '../widgets/MozSmsMessage.svelte';
    import MozMmsMessageWidget from '../widgets/MozMmsMessage.svelte';
    import { contactStorage, getContactStorage } from '../../system/stores';
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
    let messageUpdateCallback: {[key: string|number]: Function;} = {};

    let contactsUnsubscribe: any;
    let contactHash: {[key: string|number]: MozContact;} = {};
    let contactTelHash: {[key: string|number]: string|number;} = {};

    let type: MessageType = MessageType.SMS;

    let subject: string = "";
    let message: string = "";
    let attachments: Array<FileAttachment> = [];

    function registerUpdateCallback(id: string|number, fn: Function) {
        messageUpdateCallback[id] = fn;
    }

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
                        if (messageUpdateCallback[messageId]) {
                            messageUpdateCallback[messageId]();
                            delete messageUpdateCallback[messageId];
                        }
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
            if (chatContainerRef.children.length > 0) {
                chatContainerRef.scrollTo({ top: chatContainerRef.children[chatContainerRef.children.length - 1].offsetTop, behavior: 'smooth' });
            }
        }, 500);
    }

    function replyMessage() {
        const iccId = messages[messages.length - 1].iccId;
        if (thread.participants.length > 1) {
            type === MessageType.MMS;
            subject = subject || thread.lastMessageSubject || new Date().toUTCString();
        }
        if (type === MessageType.SMS) {
            const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
                detail: {
                  type: SyncProtocol.SMS_SEND_MESSAGE_SMS,
                  data: { receivers: thread.participants, message, iccId: iccId }
                }
            });
            window.dispatchEvent(evt);
        } else {
            let smilSlides = [];
            if (message && message != "") {
                smilSlides.push({ text: message });
            }
            if (attachments.length > 0) {
                smilSlides = [...smilSlides, ...attachments];
            }
            const generatedSMIL = SMIL.generate(smilSlides);
            generatedSMIL.attachments.forEach((attachment, i) => {
              generatedSMIL.attachments[i]['size'] = attachment.content.size;
              generatedSMIL.attachments[i]['type'] = attachment.content.type;
            });
            const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
                detail: {
                  type: SyncProtocol.SMS_SEND_MESSAGE_MMS,
                  data: { receivers: thread.participants, subject, smil: generatedSMIL.smil, attachments: generatedSMIL.attachments, iccId: iccId }
                }
            });
            window.dispatchEvent(evt);
        }
        subject = "";
        message = "";
        attachments = <FileAttachment>[];
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
        indexContact(getContactStorage());
        contactsUnsubscribe = contactStorage.subscribe((contactStore: ContactStore = {}) => {
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
    <div class="d-flex flex-row justify-content-between align-items-center">
        <h3>{ title || 'Thread: ' + params.threadId }</h3>
    </div>
    <div bind:this={chatContainerRef} class="d-flex flex-column chat-container">
        {#each messages as message}
            {#if message.sender == "" }
                <div class="mb-2 p-1 d-flex flex-row-reverse">
                    <svelte:component this={resolveMessageWidget(message)} showSender={false} senderName="" message={message} deleteCallback={deleteSMSMessage} registerUpdateCallback={registerUpdateCallback} />
                </div>
            {:else}
                <div class="mb-2 p-1 d-flex">
                    <svelte:component this={resolveMessageWidget(message)} showSender={thread.participants.length > 1} senderName={contactTelHash[message.sender] ? contactHash[contactTelHash[message.sender]].name[0] : message.sender} message={message} deleteCallback={deleteSMSMessage} registerUpdateCallback={registerUpdateCallback} />
                </div>
            {/if}
        {/each}
    </div>
    <div class="mb-2 d-flex flex-column reply-container">
        {#if type == MessageType.MMS }
            <input type="text" placeholder="Subject(for group texting)" bind:value={subject}/>
        {/if}
        <div class="mt-2 pb-5 d-flex flex-row">
            <div class="col-10">
                <textarea class="reply-textarea" placeholder="Enter your message here" bind:value={message}></textarea>
                {#if type == MessageType.MMS }
                    <div class="d-flex flex-row flex-wrap">
                        {#each attachments as attachment, i}
                            <div class="d-flex flex-row align-items-center mb-2 me-2">
                                <button class="btn btn-outline-danger btn-sm" on:click={() => removeAttachment(i)}>
                                    {attachment.name}
                                    {#if attachment.text && attachment.text != ""}
                                        ({attachment.text})
                                    {/if}
                                    [X]
                                </button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
            <div class="col-2">
                <div class="d-grid gap-2">
                    <button class="btn btn-primary btn-sm" on:click={toggleMessageType}>Mode: {type.toUpperCase()}</button>
                    {#if type == MessageType.MMS }
                        <button class="btn btn-primary btn-sm" on:click={()=>{fileRef.click()}}>Add Attachment</button>
                    {/if}
                    {#if thread && thread.participants.length > 0 && (type == MessageType.SMS ? message != "" : (message != "" || attachments.length > 0)) }
                        <button class="btn btn-primary btn-sm" on:click={replyMessage}>Send</button>
                    {/if}
                </div>
            </div>
        </div>
    </div>
    <input bind:this={fileRef} style="display:none" type="file" accept=".jpg, .jpeg, .png, .mp4" on:change={onFileSelected} />
</div>

<style>
    .chat-container {
        width: 100%;
        height: 60vh;
        overflow-y: scroll;
    }
    .reply-container {
        width: 100%;
        height: 20vh;
    }
    .reply-textarea {
        width: 98%;
        height: 100px;
        resize: vertical;
    }
</style>
