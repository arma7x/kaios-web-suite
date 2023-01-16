<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { openModal, closeModal } from 'svelte-modals';
    import { ChromeSystemEvent } from '../../../system/protocol';
    import { contactStorage } from '../../../system/stores';
    import { SyncProtocol, type MozContact, type ContactStore, MozContactChangeEventReason } from '../../../../../kaios-app/src/system/sync_protocol';
    import ContactEditorWidget from '../../widgets/ContactEditor.svelte';
    import '../../../system/contact2vcard';

    import vCard from 'vcf';
    let fileRef;

    let isKaiOSDeviceConnected: bool = false;
    let contactsUnsubscribe: any;
    let contactList: Array<MozContact> = [];
    let contactListIndex: {[key: string|number]: number;} = {};
    let LIMIT: number = 10;
    let offset: number = 0;
    let maxOffset: number = Math.ceil(contactList.length / LIMIT) - 1;

    function streamEvent(evt) {
        switch (evt.detail.type) {
            case ChromeSystemEvent.CONNECTION_STATUS:
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
                if (contactListIndex[evt.detail.data.contactID] != null) {
                    contactList[contactListIndex[evt.detail.data.contactID]] = evt.detail.data.contact;
                    contactList = [...contactList];
                }
                break;
            case SyncProtocol.CONTACT_EVENT_CREATE:
                contactListIndex[evt.detail.data.contactID] = contactList.length;
                contactList = [...contactList, evt.detail.data.contact];
                maxOffset = Math.ceil(contactList.length / LIMIT) - 1;
                break;
            case SyncProtocol.CONTACT_EVENT_REMOVE:
                if (contactListIndex[evt.detail.data.contactID] != null) {
                    contactList.splice(contactListIndex[evt.detail.data.contactID], 1);
                    contactList = [...contactList];
                    delete contactListIndex[evt.detail.data.contactID];
                    maxOffset = Math.ceil(contactList.length / LIMIT) - 1;
                }
                break;
            case SyncProtocol.CONTACT_IMPORT:
                getContact();
                break;
        }
    }

    function getContact() {
        offset = 0;
        contactList = [];
        const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
            detail: {
                type: SyncProtocol.CONTACT_GET_ALL,
                data: { filter: {} }
            }
        });
        window.dispatchEvent(evt);
    }

    function contactEditorCallback(contact) {
        const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
            detail: {
              type: contact.id != null ? SyncProtocol.CONTACT_UPDATE : SyncProtocol.CONTACT_SAVE,
              data: { contact: contact }
            }
        });
        window.dispatchEvent(evt);
        closeModal();
    }

    function addContact() {
        openModal(ContactEditorWidget, { titleText: 'Add Contact', buttonText: 'Submit' , contact: {}, callback: contactEditorCallback });
    }

    function updateContact(contact: MozContact) {
        openModal(ContactEditorWidget, { titleText: 'Update Contact', buttonText: 'Save', contact: contact, callback: contactEditorCallback });
    }

    function exportContact(ct: MozContact) {
        let str = '';
        ContactToVcard([ct], (vcards, nCards) => {
            str += vcards;
        }, () => {
            console.log(str, ct);
        }, null, true);
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

    function onFileSelected(evt) {
        if (evt.target.files.length > 0) {
            const file = evt.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                let mozContacts = [];
                let contacts = reader.result.split("END:VCARD\r\n");
                contacts.forEach((ctc, idx) => {
                    if (ctc.trim() == "") {
                        contacts.splice(idx, 1);
                    } else {
                        contacts[idx] += "END:VCARD";
                        const vcard = new vCard().parse(contacts[idx]);
                        const { fn, n, tel } = vcard.data;
                        let mozCt = {};
                        mozCt['name'] = [fn._data];
                        const name = n._data.split(';');
                        ['familyName', 'givenName', 'additionalName', 'honorificPrefix', 'honorificSuffix'].forEach((field, index) => {
                            mozCt[field] = name[index] ? [name[index]] : null;
                        });
                        if (tel.length) {
                            mozCt['tel'] = [];
                            tel.forEach(t => {
                                mozCt['tel'].push({ "type": [t.type], "value": t._data });
                            });
                        } else {
                            mozCt['tel'] = [{ "type": [tel.type], "value": tel._data }];
                        }
                        mozContacts.push(mozCt);
                    }
                });
                if (mozContacts.length > 0) {
                    const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
                        detail: {
                            type: SyncProtocol.CONTACT_IMPORT,
                            data: mozContacts,
                        }
                    });
                    window.dispatchEvent(evt);
                }
            }
            reader.readAsText(file);
        }
    }

    onMount(() => {
        window.addEventListener(ChromeSystemEvent.STREAM_DOWN, streamEvent);
        window.addEventListener(SyncProtocol.STREAM_DOWN, streamEvent);
        const evt = new CustomEvent(ChromeSystemEvent.STREAM_UP, {
            detail: {
              type: ChromeSystemEvent.CONNECTION_STATUS
            }
        });
        window.dispatchEvent(evt);
        contactsUnsubscribe = contactStorage.subscribe((contactStore: ContactStore = {}) => {
            let temp : {[key: string|number]: MozContact;} = {};
            if (contactStore && contactStore.contacts) {
                contactStore.contacts.forEach((contact, index) => {
                    contactListIndex[contact.id] = index;
                });
                contactList = [...contactStore.contacts];
                maxOffset = Math.ceil(contactList.length / LIMIT) - 1;
            }
        });
    });

    onDestroy(() => {
        window.removeEventListener(ChromeSystemEvent.STREAM_DOWN, streamEvent);
        window.removeEventListener(SyncProtocol.STREAM_DOWN, streamEvent);
        if (contactsUnsubscribe)
            contactsUnsubscribe();
    });

</script>

<div>
    <input bind:this={fileRef} style="display:none" type="file" accept=".vcf" on:change={onFileSelected} />
    <div class="d-flex flex-row justify-content-between align-items-center">
        <h3>KaiOS Contacts</h3>
        {#if isKaiOSDeviceConnected }
        <div class="d-flex flex-row">
            <button type="button" class="btn btn-primary btn-sm me-1" on:click={getContact}>Reload Contact</button>
            <button type="button" class="btn btn-primary btn-sm me-1" on:click={addContact}>Add Contact</button>
            <button type="button" class="btn btn-primary btn-sm"on:click={()=>{fileRef.click()}}>Import VCF</button>
        </div>
        {/if}
    </div>
    <div>
    {#if isKaiOSDeviceConnected }
    <div class="table-responsive">
        <table class="table caption-top">
            <caption>
                <div class="d-flex flex-row justify-content-between align-items-center">
                    <button type="button" class="btn btn-primary btn-sm me-1" on:click={() => {if (offset !== 0) --offset;} }>
                        Prev{#if offset !== 0 }({offset}){/if}
                    </button>
                    <h6>Page: {offset + 1}/{maxOffset + 1}</h6>
                    <button type="button" class="btn btn-primary btn-sm" on:click={() => {if (offset < maxOffset) ++offset;} }>
                        Next{#if offset < maxOffset }({offset + 2}){/if}
                    </button>
                </div>
            </caption>
            <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col">Name</th>
                    <th scope="col">Phone Number</th>
                    <th scope="col">Action</th>
                </tr>
            </thead>
            <tbody>
                {#each contactList.slice(LIMIT * offset, (LIMIT * offset) + LIMIT) as contact}
                <tr>
                    <th scope="row">{contact.id}</th>
                    <td>{ contact.name[0] }</td>
                    <td>{ contact.tel[0].value }</td>
                    <td>
                        <div class="mt-2 d-block gap-2">
                            <button class="btn btn-outline-info btn-sm mb-1" on:click={() => updateContact(contact) }>Update</button>
                            <!-- <button class="btn btn-outline-dark btn-sm mb-1" on:click={() => exportContact(contact) }>Export</button> -->
                            <button class="btn btn-outline-danger btn-sm mb-1" on:click={() => deleteContact(contact.id) }>Delete</button>
                        </div>
                    </td>
                </tr>
                {/each}
            </tbody>
        </table>
    </div>
    {:else}
        <h5>Not connected</h5>
    {/if}
    </div>
</div>
