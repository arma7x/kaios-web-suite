<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { openModal, closeModal } from 'svelte-modals';
    import { RequestSystemStatus } from '../../../system/protocol';
    import { contactStorage } from '../../../system/stores';
    import { SyncProtocol, type MozContact, type ContactStore, MozContactChangeEventReason } from '../../../../../kaios-app/src/system/sync_protocol';
    import ContactEditorWidget from '../../widgets/ContactEditor.svelte';

    let isKaiOSDeviceConnected: bool = false;
    let contactsUnsubscribe: any;
    let contactList: {[key: string|number]: MozContact;} = {};

    function streamEvent(evt) {
        switch (evt.detail.type) {
            case RequestSystemStatus.CONNECTION_STATUS:
                ({ isKaiOSDeviceConnected } = evt.detail.data);
                break;
            case SyncProtocol.CONTACT_REMOVE:
                if (evt.detail.error)
                    console.log(SyncProtocol.CONTACT_REMOVE, evt.detail.error);
                break;
            case SyncProtocol.CONTACT_UPDATE:
            case SyncProtocol.CONTACT_SAVE:
                if (evt.detail.data)
                    closeModal();
                else if (evt.detail.error)
                    console.log(evt.detail.type, evt.detail.error);
                break;
            case SyncProtocol.CONTACT_EVENT_UPDATE:
                contactList[evt.detail.data.contactID] = evt.detail.data.contact;
                contactList = {...contactList};
                break;
            case SyncProtocol.CONTACT_EVENT_CREATE:
                contactList[evt.detail.data.contactID] = evt.detail.data.contact;
                contactList = {...contactList};
                break;
            case SyncProtocol.CONTACT_EVENT_REMOVE:
                delete contactList[evt.detail.data.contactID];
                contactList = {...contactList};
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
        openModal(ContactEditorWidget, { titleText: 'Add Contact', buttonText: 'Submit' , contact: {} });
    }

    function updateContact(contact: MozContact) {
        openModal(ContactEditorWidget, { titleText: 'Update Contact', buttonText: 'Save', contact: contact });
    }

    function deleteContact(id: string) {
        if (!confirm(`Are sure you want to remove ${id} ?`))
            return;
        const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
            detail: {
                type: SyncProtocol.CONTACT_REMOVE,
                data: {
                    filter: {
                        filterBy: ['id'],
                        filterValue: id,
                        filterOp: 'equals',
                        filterLimit: 1
                    }
                }
            }
        });
        window.dispatchEvent(evt);
    }

    onMount(() => {
        window.addEventListener(RequestSystemStatus.STREAM_DOWN, streamEvent);
        window.addEventListener(SyncProtocol.STREAM_DOWN, streamEvent);
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
        window.removeEventListener(SyncProtocol.STREAM_DOWN, streamEvent);
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
            <div style="margin-bottom:4px;">
                {key}: { contact.name[0] },  { contact.tel[0].value }
                <button on:click={() => deleteContact(key) }>deleteContact</button>
                <button on:click={() => updateContact(contact) }>updateContact</button>
            </div>
        {/each}
        </div>
    {:else}
        <h5>Not connected</h5>
    {/if}
</div>
