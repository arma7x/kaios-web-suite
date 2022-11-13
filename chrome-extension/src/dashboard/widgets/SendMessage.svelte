<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { closeModal } from 'svelte-modals';
    import { SyncProtocol, MessageType, type MozContact, type MmsAttachment, type FileAttachment } from '../../../../kaios-app/src/system/sync_protocol';
    import { contacts as contactsDataStore, getContacts as getContactsDataStore } from '../../system/stores';
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
        updateContacts(getContactsDataStore());
        contactsUnsubscribe = contactsDataStore.subscribe((contactStore: ContactStore = {}) => {
            updateContacts(contactStore);
        });
    });

    onDestroy(() => {
        if (contactsUnsubscribe)
            contactsUnsubscribe();
    });

</script>

{#if isOpen}
    <div role="dialog" class="modal">
        <div class="contents">
            <h2>{title}</h2>
            <div class="recipients-container">
                {#each receivers as value, i}
                <div class="recipient-box">{typeof value === 'string' ? value : value.name[0] }<button class="remove" on:click={() => popReceiver(i)}>x</button></div>
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
            <div class="message-container">
                {#if type == MessageType.MMS }
                    <input type="text" style="margin-bottom:1em;" placeholder="Subject(for group texting)" bind:value={subject}/>
                {/if}
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
            <div class="actions">
                {#if type == MessageType.MMS }
                    <button class="pure-button" on:click={()=>{fileRef.click()}}>Add Attachment</button>
                {/if}
                <button class="pure-button" on:click={toggleMessageType}>Mode: {type.toUpperCase()}</button>
                {#if receivers.length > 0 && (type == MessageType.SMS ? message != "" : (message != "" || attachments.length > 0)) }
                    <button class="pure-button" on:click={sendMessage}>Send</button>
                {/if}
                <button class="pure-button" on:click={closeModal}>Cancel</button>
            </div>
        </div>
        <input bind:this={fileRef} style="display:none" type="file" accept=".jpg, .jpeg, .png, .mp4" on:change={onFileSelected} />
    </div>
{/if}

<style>
    .modal {
        position: fixed;
        top: 0;
        bottom: 0;
        right: 0;
        left: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        /* allow click-through to backdrop */
        pointer-events: none;
    }

    .contents {
        min-width: 500px;
        max-width: 500px;
        border-radius: 6px;
        padding: 16px;
        background: white;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        pointer-events: auto;
    }

    h2 {
        text-align: center;
        font-size: 24px;
    }

    .actions {
        margin-top: 32px;
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
    }

    .actions > .pure-button {
        margin-left: 1em;
    }

    .recipients-container {
        margin: 0 0 1em 0;
        padding: 0;
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
    }

    .recipients-container > .recipient-box {
        box-sizing: border-box;
        padding: 2px;
        margin: 0px 4px 2px 0;
        border: solid red 1px;
        line-height: 24px;
        min-height: 30px;
        max-height: 30px;
    }

    .recipients-container > .recipient-box > .remove {
        cursor: pointer;
        color: rgb(255, 255, 255);
        background-color: red;
        margin: -2px 0px 0px 2px;
        padding: 0px;
        border-radius: 50%;
        border: 0px solid transparent;
        text-align: center;
        width: 20px;
        height: 20px;
        line-height: 0;
        vertical-align: middle;
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
        top: 33px;
        width: 100%;
        background-color: #fff;
        border: solid 0.5px #c0c0c0;
        border-radius: 3px;
    }

    .recipients-container > .recipient-input > .recipient-suggestions > .suggestion{
        padding: 5px;
        cursor: pointer;
        list-style-type: none;
        font-weight: bold;
    }

    .message-container > textarea {
        height: 150px;
        width: 100%;
        resize: vertical;
    }

    .message-container > input {
        height: 30px;
        width: 100%;
    }

    .message-container > .attachment-container {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
    }

    .message-container > .attachment-container > .attachment-item {
        margin: 1em 0.5em 0 0;
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .message-container > .attachment-container > .attachment-item > .attachment-label {
        margin-right: 0.5em;
    }

</style>
