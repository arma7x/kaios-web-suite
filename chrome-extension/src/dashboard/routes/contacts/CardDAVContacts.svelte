<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { openModal, closeModal } from 'svelte-modals';
    import { DAVClient } from 'tsdav/dist/tsdav';
    import { ChromeSystemEvent } from '../../../system/protocol';
    import ContactEditorWidget from '../../widgets/ContactEditor.svelte';
    import vCard from 'vcf';
    import {v4 as uuidv4} from 'uuid';

    let davClient: DAVClient;
    let contactList: Array<{[key: string|number]: any;}> = [];
    let contactListIndex: {[key: string|number]: number;} = {};
    let LIMIT: number = 10;
    let offset: number = 0;
    let maxOffset: number = Math.ceil(contactList.length / LIMIT) - 1;

    function getContact() {
        offset = 0;
        contactList = [];
        let config = {
            serverUrl: window.localStorage.getItem('serverUrl'),
            username: window.localStorage.getItem('username'),
            password: window.localStorage.getItem('password')
        }
        davClient = new DAVClient({
            serverUrl: config.serverUrl,
            credentials: {
                username: config.username,
                password: config.password,
            },
            authMethod: 'Basic',
            defaultAccountType: 'carddav',
        });
        (async () => {
            try {
                await davClient.login();
                const addressBooks = await davClient.fetchAddressBooks();
                const vcards = await davClient.fetchVCards({
                    addressBook: addressBooks[0],
                });
                let temp: Array<{[key: string|number]: any;}> = [];
                vcards.forEach((contact, index) => {
                    contact = prepareContact(contact);
                    temp.push(contact);
                    contactListIndex[contact.vcard.data.uid._data] = index;
                });
                contactList = [...temp];
                maxOffset = Math.ceil(contactList.length / LIMIT) - 1;
                // console.log(contactList);
            } catch(err) {
                console.log(err);
            }
        })();
    }

    function prepareContact(contact) {
        contact.vcard = new vCard().parse(contact.data);
        const { fn, n, tel } = contact.vcard.data;
        let mozCt = {};
        mozCt['id'] = contact.vcard.data.uid._data;
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
        contact.mozContact = mozCt;
        return contact;
    }

    function contactEditorCallback(contact) {
        if (contact.id) {
            let str = '';
            ContactToVcard([contact], (vcards, nCards) => {
                str += vcards;
            }, () => {
                const temp = new vCard().parse(str);
                contactList[contactListIndex[contact.id]].vcard.setProperty(temp.data.fn);
                contactList[contactListIndex[contact.id]].vcard.setProperty(temp.data.n);
                if (temp.data.tel.length) {
                    temp.data.tel.forEach((tel, index) => {
                        if (index == 0)
                            contactList[contactListIndex[contact.id]].vcard.setProperty(tel);
                        else
                            contactList[contactListIndex[contact.id]].vcard.addProperty(tel);
                    });
                } else {
                    contactList[contactListIndex[contact.id]].vcard.setProperty(temp.data.tel);
                }
                (async () => {
                    try {
                        await davClient.login();
                        const addressBooks = await davClient.fetchAddressBooks();
                        const updateVCard = await davClient.updateVCard({
                            vCard: {
                                url: contactList[contactListIndex[contact.id]].url,
                                data: contactList[contactListIndex[contact.id]].vcard.toString(),
                                etag: contactList[contactListIndex[contact.id]].etag
                            }
                        });
                        const vcards = await davClient.fetchVCards({
                            addressBook: addressBooks[0],
                            objectUrls: [contactList[contactListIndex[contact.id]].url],
                        });
                        vcards.forEach((contact, index) => {
                            contact = prepareContact(contact);
                            if (contactListIndex[contact.vcard.data.uid._data]) {
                                contactList[contactListIndex[contact.vcard.data.uid._data]] = contact;
                            }
                        });
                        contactList = [...contactList];
                    } catch(err) {
                        console.log(err);
                    }
                })();
            }, null, true);
        } else {
            let str = '';
            ContactToVcard([contact], (vcards, nCards) => {
                str += vcards;
            }, () => {
                const temp = new vCard().parse(str);
                (async () => {
                    try {
                        await davClient.login();
                        const addressBooks = await davClient.fetchAddressBooks();
                        const createVCard = await davClient.createVCard({
                          addressBook: addressBooks[0],
                          filename: `${uuidv4()}.vcf`,
                          vCardString: temp.toString(),
                        });
                        const vcards = await davClient.fetchVCards({
                            addressBook: addressBooks[0],
                            objectUrls: [createVCard.url],
                        });
                        vcards.forEach((contact, index) => {
                            contact = prepareContact(contact);
                            contactList.push(contact);
                            contactListIndex[contact.vcard.data.uid._data] = contactList.length - 1;
                        });
                        contactList = [...contactList];
                        maxOffset = Math.ceil(contactList.length / LIMIT) - 1;
                    } catch(err) {
                        console.log(err);
                    }
                })();
            }, null, true);
        }
        closeModal();
    }

    function addContact() {
        openModal(ContactEditorWidget, { titleText: 'Add Contact', buttonText: 'Submit' , contact: {}, callback: contactEditorCallback });
    }

    function updateContact(contact: MozContact) {
        openModal(ContactEditorWidget, { titleText: 'Update Contact', buttonText: 'Save', contact: contact.mozContact, callback: contactEditorCallback });
    }

    function exportContact(contact) {}

    async function deleteContact(id: string) {
        if (!confirm(`Are sure you want to remove ${id} ?`))
            return;
        if (contactList[contactListIndex[id]]) {
            try {
                await davClient.login();
                const deleteVCard = await davClient.deleteVCard({
                    vCard: {
                        url: contactList[contactListIndex[id]].url,
                        etag: contactList[contactListIndex[id]].etag
                    }
                });
                contactList.splice(contactListIndex[id], 1);
                contactList = [...contactList];
                delete contactListIndex[id];
                maxOffset = Math.ceil(contactList.length / LIMIT) - 1;
                if (offset > maxOffset)
                    --offset;
            } catch(err) {
                console.log(err);
            }
        }
    }

    onMount(() => {
        console.log('onMount Contacts');
        getContact();
    });

    onDestroy(() => {
        console.log('onDestroy Contacts');
    });
</script>

<div>
    <div class="d-flex flex-row justify-content-between align-items-center">
        <h3>CardDAV</h3>
        <div class="d-flex flex-row">
            <button type="button" class="btn btn-primary btn-sm me-1" on:click={getContact}>Reload Contact</button>
            <button type="button" class="btn btn-primary btn-sm" on:click={addContact}>Add Contact</button>
        </div>
    </div>

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
                    <th scope="row">{contact.vcard.data.uid._data}</th>
                    <td>{ contact.mozContact.name[0] }</td>
                    <td>{ contact.mozContact.tel[0].value }</td>
                    <td>
                        <div class="mt-2 d-block gap-2">
                            <button class="btn btn-outline-info btn-sm mb-1" on:click={() => updateContact(contact) }>Update</button>
                            <button class="btn btn-outline-dark btn-sm mb-1" on:click={() => exportContact(contact) }>Export</button>
                            <button class="btn btn-outline-danger btn-sm mb-1" on:click={() => deleteContact(contact.vcard.data.uid._data) }>Delete</button>
                        </div>
                    </td>
                </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
