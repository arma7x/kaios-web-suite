<script lang="ts">
    import "normalize.css";
    import "purecss";
    import "../../system/global.css";

    import { onMount, onDestroy } from 'svelte';
    import { contactStorage, getContactStorage } from '../../system/stores';
    import { SyncProtocol, type MozMobileMessageThread, type MozContact, type ContactStore, type MmsAttachment, MessageType } from '../../../../kaios-app/src/system/sync_protocol';
    import SMIL from '../../system/smil';
    import { openModal } from 'svelte-modals';
    import SendMessageWidget from '../widgets/SendMessage.svelte';
    import SMSGuide from '../widgets/guide/SMS.svelte';

    let threads: Array<MozMobileMessageThread> = [];
    let contactsUnsubscribe: any;
    let contacts: Array<MozContact> = [];
    let contactHash: {[key: string|number]: MozContact;} = {};
    let contactTelHash: {[key: string|number]: string|number;} = {};
    let threadTitleCache: {[key: string|number]: string;} = {};

    function streamEvent(evt) {
        switch (evt.detail.type) {
            case SyncProtocol.SMS_GET_THREAD:
                threads = evt.detail.data.threads;
                break;
        }
    }

    function sendMessage() {
        openModal(SendMessageWidget, { title: 'New Message' });
    }

    function openGuide() {
        openModal(SMSGuide);
    }

    function indexContact(contactStore: ContactStore = {}) {
        if (contactStore.contacts)
            contacts = [...contactStore.contacts];
        if (contactStore.contactHash)
            contactHash = {...contactStore.contactHash};
        if (contactStore.contactTelHash)
            contactTelHash = {...contactStore.contactTelHash};
        threadTitleCache = [];
        threads.forEach(thread => {
            getThreadTitle(thread);
        });
    }

    function getThreadTitle(thread: MozMobileMessageThread): string {
        if (threadTitleCache[thread.id])
            return threadTitleCache[thread.id];
        let participants: Array<string> = [];
        thread.participants.forEach((participant) => {
            participants.push(contactTelHash[participant] ? contactHash[contactTelHash[participant]].name[0] : participant);
        });
        threadTitleCache[thread.id] = participants.join(', ');
        return threadTitleCache[thread.id];
    }

    onMount(() => {
        const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
            detail: {
              type: SyncProtocol.SMS_GET_THREAD
            }
        });
        window.dispatchEvent(evt);
        window.addEventListener(SyncProtocol.STREAM_DOWN, streamEvent);
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
    <div class="header-container">
        <h1>SMS</h1>
        <div class="buttons">
            <button on:click={sendMessage}>Send Message</button>
            <button on:click={openGuide}>Guide</button>
        </div>
    </div>
    <div>
        {#each threads as thread}
            <div class="thread">
                <a class="pure-button wrapword" style="width:100%;" href="#/chat/{thread.id}?data={encodeURIComponent(JSON.stringify(thread))}&title={encodeURIComponent(threadTitleCache[thread.id] ? threadTitleCache[thread.id] : getThreadTitle(thread))}">
                    <b>
                        {#if thread.unreadCount > 0}<span class="badge">{thread.unreadCount}</span>{/if}
                        {threadTitleCache[thread.id] ? threadTitleCache[thread.id] : getThreadTitle(thread)}
                    </b>
                    <p>{thread.lastMessageType === MessageType.MMS ? MessageType.MMS.toUpperCase() : thread.body}</p>
                    <small>{new Date(thread.timestamp).toLocaleString()}</small>
                </a>
            </div>
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
    .header-container > .buttons {
        display: flex;
        flex-direction: row;
    }
    .header-container > .buttons > button {
        margin-left: 0.5em;
    }
    .thread {
        margin-bottom: 1em;
    }
    .pure-button {
        text-align: unset;
    }
    .badge {
        color: white;
        background-color: red;
        padding: 1px 2px 1px 3px;
        border-radius: 30%;
    }
</style>
