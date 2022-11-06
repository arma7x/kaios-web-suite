<script lang="ts">
    import "normalize.css";
    import "purecss";
    import "../../system/global.css";

    import { onMount, onDestroy } from 'svelte';
    import { contacts as contactsDataStore, getContacts as getContactsDataStore } from '../../system/stores';
    import { SyncProtocol } from '../../../../kaios-app/src/system/sync_protocol';

    let threads: Array<SyncProtocol.MozMobileMessageThread> = [];
    let contactsUnsubscribe: any;
    let contacts: Array<SyncProtocol.MozContact> = [];
    let contactHash: {[key: string|number]: SyncProtocol.MozContact;} = {};
    let contactTelHash: {[key: string|number]: string|number;} = {};

    function streamEvent(evt) {
        switch (evt.detail.type) {
            case SyncProtocol.SMS_GET_THREAD:
                threads = evt.detail.data.threads;
                break;
        }
    }

    function sendSMS() {
        let recipient = prompt("Please enter recipient");
        if (recipient == null || recipient == '')
            return;
        let text = prompt("Please enter text");
        if (text == null || text == '')
            return;
        const evt = new CustomEvent(SyncProtocol.STREAM_PARENT, {
            detail: {
              type: SyncProtocol.SMS_SEND_MESSAGE_SMS,
              data: { receivers: [recipient], message: text, iccId: "" }
            }
        });
        window.dispatchEvent(evt);
    }

    function indexContact(contactStore: SyncProtocol.ContactStore = {}) {
        if (contactStore.contacts)
            contacts = [...contactStore.contacts];
        if (contactStore.contactHash)
            contactHash = {...contactStore.contactHash};
        if (contactStore.contactTelHash)
            contactTelHash = {...contactStore.contactTelHash};
    }

    onMount(() => {
        const evt = new CustomEvent(SyncProtocol.STREAM_PARENT, {
            detail: {
              type: SyncProtocol.SMS_GET_THREAD
            }
        });
        window.dispatchEvent(evt);
        window.addEventListener(SyncProtocol.STREAM_CHILD, streamEvent);
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
        <h1>SMS</h1>
        <button on:click={sendSMS}>Send SMS</button>
    </div>
    <div>
        {#each threads as thread}
            <div class="thread">
                <a class="pure-button wrapword" style="width:100%;" href="#/chat/{thread.id}?data={encodeURIComponent(JSON.stringify(thread))}&title={thread.lastMessageSubject != "" ? thread.lastMessageSubject : (contactTelHash[thread.participants[0]] ? contactHash[contactTelHash[thread.participants[0]]].name[0] : thread.participants[0])}">
                    <b>{thread.lastMessageSubject != "" ? thread.lastMessageSubject : (contactTelHash[thread.participants[0]] ? contactHash[contactTelHash[thread.participants[0]]].name[0] : thread.participants[0])}</b>
                    <p>{thread.body}</p>
                    <small>{new Date(thread.timestamp).toLocaleString()}</small>
                </a>
            </div>
        {/each}
    </div>
</div>

<style>
    .thread {
        margin-bottom: 1em;
    }
    .pure-button {
        text-align: unset;
    }
</style>
