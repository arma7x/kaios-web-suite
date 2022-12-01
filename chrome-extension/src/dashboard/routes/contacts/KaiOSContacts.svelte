<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { openModal } from 'svelte-modals';
    import { RequestSystemStatus } from '../../../system/protocol';
    import { contactStorage } from '../../../system/stores';
    import { SyncProtocol, type MozContact, type ContactStore } from '../../../../../kaios-app/src/system/sync_protocol';
    import AddContactWidget from '../../widgets/AddContact.svelte';

    let isKaiOSDeviceConnected: bool = false;
    let contactsUnsubscribe: any;
    let contactList: {[key: string|number]: MozContact;} = {};

    function streamEvent(evt) {
        switch (evt.detail.type) {
            case RequestSystemStatus.CONNECTION_STATUS:
                ({ isKaiOSDeviceConnected } = evt.detail.data);
                break;
        }
    }

    function getContact() {
        contactList = [];
        setTimeout(() => {
            const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
                detail: {
                    type: SyncProtocol.CONTACT_GET_ALL,
                    data: { filter: {} }
                }
            });
            window.dispatchEvent(evt);
        }, 3000);
    }

    function addContact() {
        openModal(AddContactWidget, { title: 'New Message' });
    }

    function updateContact() {}

    function deleteContact() {}

    onMount(() => {
        window.addEventListener(RequestSystemStatus.STREAM_DOWN, streamEvent);
        const evt = new CustomEvent(RequestSystemStatus.STREAM_UP, {
            detail: {
              type: RequestSystemStatus.CONNECTION_STATUS
            }
        });
        window.dispatchEvent(evt);
        contactsUnsubscribe = contactStorage.subscribe((contactStore: ContactStore = {}) => {
            let temp : {[key: string|number]: MozContact;} = {};
            if (contactStore && contactStore.contacts) {
                contactStore.contacts.forEach(contact => {
                    temp[contact.id] = contact;
                });
            }
            contactList = {...temp};
        });
    });

    onDestroy(() => {
        window.removeEventListener(RequestSystemStatus.STREAM_DOWN, streamEvent);
        if (contactsUnsubscribe)
            contactsUnsubscribe();
    });

</script>

<div>
    <h1>KaiOS Contacts</h1>
    {#if isKaiOSDeviceConnected }
        <div>
            <button on:click={getContact}>getContact</button>
            <button on:click={addContact}>addContact</button>
        </div>
        <div>
        {#each Object.entries(contactList) as [key, contact]}
            <div style="margin-bottom:4px;">{key}: { contact.name[0] },  { contact.tel[0].value }</div>
        {/each}
        </div>
    {:else}
        <h5>Not connected</h5>
    {/if}
</div>
