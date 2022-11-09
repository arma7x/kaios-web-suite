<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { closeModal } from 'svelte-modals';
    import { MessageType, type MozContact } from '../../../../kaios-app/src/system/sync_protocol';
    import { contacts as contactsDataStore, getContacts as getContactsDataStore } from '../../system/stores';

    export let isOpen; // provided by Modals

    export let title;

    interface Attachment {
        name: string,
        blob: Blob,
        text: string,
    }

    let inputRef;

    let contactsUnsubscribe: any;
    let contacts: Array<MozContact> = [];

    let type: MessageType = MessageType.SMS;

    let subject: string = "";
    let message: string|Array<string|Attachment> = "";
    let receivers: Array<string|MozContact> = [];

    let suggestions = [];
    let suggestionTimeout;

    function updateContacts(contactStore: ContactStore = {}) {
        if (contactStore.contacts)
            contacts = [...contactStore.contacts];
    }

    function toggleMessageType() {
        console.log(type, message);
        if (type === MessageType.SMS) {
            type = MessageType.MMS;
            if (message != "")
                message = [message];
            else
                message = [];
        } else {
            type = MessageType.SMS;
            if (message.length > 0)
                message = typeof message[0] === "string" ? message[0] : (message[0].text || "");
             else
                message = "";
        }
    }

    function processSuggestion() {
            suggestionTimeout = setTimeout(() => {
                let temp = contacts.filter((contact) => {
                    let found = false;
                    if (contact.name) {
                        for (let i in contact.name) {
                            if (contact.name[i].toLowerCase().indexOf(inputRef.value.toLowerCase()) > -1)
                                found = contact;
                        }
                        if (found)
                            return found;
                    }
                    if (contact.tel) {
                        for (let i in contact.tel) {
                            if (contact.tel[i].value.indexOf(inputRef.value) > -1 || contact.tel[i].value.replaceAll(" ", "").indexOf(inputRef.value) > -1)
                                found = contact;
                        }
                        if (found)
                            return found;
                    }
                    return found;
                });
                suggestions = [...temp];
            }, 300)
    }

    function onSelectSuggestion(contact) {
        inputRef.value = '';
        suggestions = [];
        receivers = [...receivers, contact];
    }

    function onKeydown(self) {
        if (suggestionTimeout)
                clearTimeout(suggestionTimeout);
        if (self.code === 'Enter') {
                clearTimeout(suggestionTimeout);
                receivers = [...receivers, inputRef.value];
                inputRef.value = '';
                suggestions = [];
        } else {
            suggestions = [];
            processSuggestion();
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
            {#if (type == MessageType.SMS) }
                <textarea placeholder="Enter your message here" bind:value={message}></textarea>
            {:else}
                <input type="text" placeholder="Subject(for group thread)" bind:value={subject}/>
                <div style="width:100%;display:flex;flex-direction:column;">
                    {JSON.stringify(message)};
                </div>
            {/if}
            </div>
            <div class="actions">
                {#if (type == MessageType.MMS) }
                    <button class="pure-button" on:click="{closeModal}">Add Text</button>
                    <button class="pure-button" on:click="{closeModal}">Add Media</button>
                {/if}
                <button class="pure-button" on:click="{toggleMessageType}">Mode: {type.toUpperCase()}</button>
                <button class="pure-button" on:click="{closeModal}">OK</button>
            </div>
        </div>
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

    p {
        text-align: center;
        margin-top: 16px;
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
</style>
