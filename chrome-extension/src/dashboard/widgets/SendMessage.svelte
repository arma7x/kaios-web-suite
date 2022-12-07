<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { closeModal } from 'svelte-modals';
    import { SyncProtocol, MessageType, type MozContact, type MmsAttachment, type FileAttachment } from '../../../../kaios-app/src/system/sync_protocol';
    import { contactStorage, getContactStorage } from '../../system/stores';
    import SMIL from '../../system/smil';

    export let isOpen; // provided by Modals

    export let title;

    let inputRef;
    let fileRef;

    let contactsUnsubscribe: any;
    let contacts: Array<MozContact> = [];

    let type: MessageType = MessageType.SMS;

    let subject: string = "";
    let message: string = "";
    let attachments: Array<FileAttachment> = [];
    let receivers: Array<string|MozContact> = [];

    let suggestions = [];
    let suggestionTimeout;

    function updateContacts(contactStore: ContactStore = {}) {
        if (contactStore.contacts)
            contacts = [...contactStore.contacts];
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

    function searchSuggestion(value: string, find: false): Array<MozContact>|MozContact {
        let temp = contacts[find ? 'find' : 'filter']((contact) => {
            let found = false;
            if (contact.name) {
                for (let i in contact.name) {
                    let test = false;
                    if (find)
                        test = contact.name[i].toLowerCase() === inputRef.value.toLowerCase();
                    else
                        test = contact.name[i].toLowerCase().indexOf(inputRef.value.toLowerCase()) > -1;
                    if (test)
                        found = contact;
                }
                if (found)
                    return found;
            }
            if (contact.tel) {
                for (let i in contact.tel) {
                    let test = false;
                    if (find)
                        test = contact.tel[i].value === inputRef.value || contact.tel[i].value.replaceAll(" ", "") === inputRef.value;
                    else
                        test = contact.tel[i].value.indexOf(inputRef.value) > -1 || contact.tel[i].value.replaceAll(" ", "").indexOf(inputRef.value) > -1
                    if (test)
                        found = contact;
                }
                if (found)
                    return found;
            }
            return found;
        });
        return temp;
    }

    function processSuggestion() {
        suggestionTimeout = setTimeout(() => {
            if (inputRef.value && inputRef.value != '') {
                suggestions = [...searchSuggestion(inputRef.value)];
            }
        }, 500)
    }

    function onSelectSuggestion(contact) {
        inputRef.value = '';
        suggestions = [];
        receivers = [...receivers, contact];
    }

    function onKeydown(self) {
        if (self.code === 'Enter') {
            clearTimeout(suggestionTimeout);
            const contact = searchSuggestion(inputRef.value, true) || inputRef.value;
            receivers = [...receivers, contact];
            inputRef.value = '';
            suggestions = [];
        }
    }

    function onInput(self) {
        suggestions = [];
        if (!inputRef.value || inputRef.value == "")
            clearTimeout(suggestionTimeout);
        else
            processSuggestion();
    }

    function popReceiver(index) {
        receivers.splice(index, 1);
        receivers = [...receivers];
    }

    function sendMessage() {
        let filteredReceivers = [];
        receivers.forEach((contact) => {
            if (typeof contact == "object" && contact.tel && contact.tel.length > 0) {
                filteredReceivers.push(contact.tel[0].value.replaceAll(" ", ""));
            } else if (typeof contact == "string" ) {
                filteredReceivers.push(contact);
            }
        });
        if (type === MessageType.SMS) {
            const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
                detail: {
                  type: SyncProtocol.SMS_SEND_MESSAGE_SMS,
                  data: { receivers: filteredReceivers, message, iccId: "" }
                }
            });
            window.dispatchEvent(evt);
            closeModal();
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
                  data: { receivers: filteredReceivers, subject, smil: generatedSMIL.smil, attachments: generatedSMIL.attachments, iccId: "" }
                }
            });
            window.dispatchEvent(evt);
            closeModal();
        }
    }

    onMount(() => {
        updateContacts(getContactStorage());
        contactsUnsubscribe = contactStorage.subscribe((contactStore: ContactStore = {}) => {
            updateContacts(contactStore);
        });
    });

    onDestroy(() => {
        if (contactsUnsubscribe)
            contactsUnsubscribe();
    });

</script>

{#if isOpen}
    <div class="svelte-modals modal">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Guide</h5>
                    <button on:click={closeModal} type="button" class="btn-close" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="d-flex flex-row flex-wrap recipients-container">
                        {#each receivers as value, i}
                        <div class="border border-primary rounded p-1 me-1 mb-1 d-flex flex-row justify-content-between align-items-center">{typeof value === 'string' ? value : value.name[0] }<button class="btn badge rounded-pill text-bg-danger ms-1" on:click={() => popReceiver(i)}>x</button></div>
                        {/each}
                        <div class="recipient-input">
                            <input bind:this={inputRef} placeholder="Enter phone number" on:keydown={onKeydown} on:input={onInput}/>
                            {#if suggestions.length > 0}
                            <ul class="recipient-suggestions">
                                {#each suggestions as value, i}
                                    <li class="suggestion"><a href="/#" on:click|preventDefault={() => onSelectSuggestion(value)} >{value.name[0]}</a></li>
                                {/each}
                            </ul>
                            {/if}
                        </div>
                    </div>
                    <div class="d-flex flex-column reply-container">
                        {#if type == MessageType.MMS }
                            <input type="text" placeholder="Subject(for group texting)" bind:value={subject}/>
                        {/if}
                        <textarea class="mt-1 reply-textarea" placeholder="Enter your message here" bind:value={message}></textarea>
                        {#if type == MessageType.MMS }
                            <div class="mt-1 d-flex flex-row flex-wrap">
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
                </div>
                <div class="modal-footer">
                    {#if type == MessageType.MMS }
                        <button class="btn btn-primary btn-sm me-2" on:click={()=>{fileRef.click()}}>Add Attachment</button>
                    {/if}
                    <button class="btn btn-primary btn-sm me-2" on:click={toggleMessageType}>Mode: {type.toUpperCase()}</button>
                    {#if receivers.length > 0 && (type == MessageType.SMS ? message != "" : (message != "" || attachments.length > 0)) }
                        <button class="btn btn-primary btn-sm me-2" on:click={sendMessage}>Send</button>
                    {/if}
                    <button class="btn btn-primary btn-sm me-2" on:click={closeModal}>Cancel</button>
                </div>
            </div>
        </div>
        <input bind:this={fileRef} style="display:none" type="file" accept=".jpg, .jpeg, .png, .mp4" on:change={onFileSelected} />
    </div>
{/if}

<style>
    .reply-textarea {
        height: 150px;
        resize: vertical;
    }

    .recipients-container > .recipient-input {
        position: relative;
        display: flex;
        flex-direction: column;
    }

    .recipients-container > .recipient-input > input {
        border: 0;
        height: 30px;
    }

    .recipients-container > .recipient-input > .recipient-suggestions {
        margin: 0;
        padding: 0;
        position: absolute;
        top: 30px;
        width: 100%;
        background-color: #fff;
        border: solid 0.5px #c0c0c0;
        border-radius: 3px;
    }

    .recipients-container > .recipient-input > .recipient-suggestions > .suggestion {
        padding: 5px;
        cursor: pointer;
        list-style-type: none;
        font-weight: bold;
    }

    .recipients-container > .recipient-input > .recipient-suggestions > .suggestion > a {
        text-decoration: none;
    }

</style>
