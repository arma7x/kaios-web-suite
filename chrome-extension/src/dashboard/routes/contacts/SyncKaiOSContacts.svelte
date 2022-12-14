<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { ChromeSystemEvent } from '../../../system/protocol';
    import { contactStorage } from '../../../system/stores';
    import { SyncProtocol, type MozContact, type ContactStore } from '../../../../../kaios-app/src/system/sync_protocol';
    import { DAVClient } from 'tsdav/dist/tsdav';
    import vCard from 'vcf';
    import {v4 as uuidv4} from 'uuid';

    interface _Contact {
        kaios: string,
        carddav: string,
        status: boolean,
    }

    let isKaiOSDeviceConnected: bool = false;
    let kaiosContactsUnsubscribe: any;
    let kaiosContactList: Array<MozContact> = [];
    let kaiosContactListIndex: {[key: string|number]: number;} = {};
    let kaiosContactKeyIndex: {[key: string|number]: number;} = {};

    let davClient: DAVClient;
    let davContactList: Array<{[key: string|number]: any;}> = [];
    let davContactListIndex: {[key: string|number]: number;} = {};

    let skipOrUpdateList: Array<_Contact> = [];
    let removeOrPushList: Array<_Contact> = [];

    function streamEvent(evt) {
        switch (evt.detail.type) {
            case ChromeSystemEvent.CONNECTION_STATUS:
                ({ isKaiOSDeviceConnected } = evt.detail.data);
                break;
        }
    }

    function getKaiOSContact() {
        kaiosContactList = [];
        kaiosContactListIndex = {};
        const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
            detail: {
                type: SyncProtocol.CONTACT_GET_ALL,
                data: { filter: {} }
            }
        });
        window.dispatchEvent(evt);
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

    function getDAVContact() {
        davContactList = [];
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
                    davContactListIndex[contact.vcard.data.uid._data] = index;
                });
                davContactList = [...temp];
                skipOrUpdateList = [];
                removeOrPushList = [];
                kaiosContactList.forEach(c => {
                    if (c.key && c.key.length > 0) {
                        let push = true;
                        for (let i in c.key) {
                            if (davContactListIndex[c.key[i]]) {
                                skipOrUpdateList.push({ kaios: c.id, carddav: c.key[i], status: false });
                                push = false;
                                break;
                            }
                        }
                        if (push)
                            removeOrPushList.push({ kaios: c.id, carddav: null, status: false });
                    } else
                        removeOrPushList.push({ kaios: c.id, carddav: null, status: false });
                });
            } catch(err) {
                console.log(err);
            }
        })();
    }

    async function sync() {
        let deleteList = [];
        let pushList = {};
        let pushListVcard = {};
        // console.log(kaiosContactList, kaiosContactListIndex, kaiosContactKeyIndex);
        // console.log(skipOrUpdateList, removeOrPushList);
        removeOrPushList.forEach(c => {
            if (c.status === true)
                deleteList.push(c.kaios);
            else {
                pushList[c.kaios] = `${uuidv4()}.vcf`;
                pushListVcard[c.kaios] = ConvertMozContactToVcard(kaiosContactList[kaiosContactListIndex[c.kaios]]);
            }
        });
        console.log('deleteList:', deleteList);
        console.log('pushList:', pushList);
        console.log('pushListVcard:', pushListVcard);
    }

    onMount(() => {
        window.addEventListener(ChromeSystemEvent.STREAM_DOWN, streamEvent);
        kaiosContactsUnsubscribe = contactStorage.subscribe((contactStore: ContactStore = {}) => {
            let temp : {[key: string|number]: MozContact;} = {};
            if (contactStore && contactStore.contacts) {
                contactStore.contacts.forEach((contact, index) => {
                    kaiosContactListIndex[contact.id] = index;
                    if (contact.key && contact.key.length > 0) {
                        contact.key.forEach(key => {
                            kaiosContactKeyIndex[key] = index;
                        });
                    }
                });
                kaiosContactList = [...contactStore.contacts];
                getDAVContact();
            }
        });
    });

    onDestroy(() => {
        window.removeEventListener(ChromeSystemEvent.STREAM_DOWN, streamEvent);
        if (kaiosContactsUnsubscribe)
            kaiosContactsUnsubscribe();
    });
</script>

<div>
    <div class="d-flex flex-row justify-content-between align-items-center">
        <h3>Sync Contacts [KaiOS->CardDAV]</h3>
        <div class="d-flex flex-row">
            <button type="button" class="btn btn-primary btn-sm me-1" on:click={getKaiOSContact}>Refres</button>
            <button type="button" class="btn btn-primary btn-sm" on:click={sync}>Sync</button>
        </div>
    </div>
    <div>
    {#each skipOrUpdateList as meta}
        <div>
        {JSON.stringify(kaiosContactList[kaiosContactListIndex[meta.kaios]])}
        {JSON.stringify(meta)}
        </div>
    {/each}
    </div>
    <div>
        <div class="table-responsive">
            <table class="table caption-top">
                <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">Name</th>
                        <th scope="col">Phone Number</th>
                        <th scope="col" class="col-1">Remove(KaiOS)</th>
                        <th scope="col" class="col-1">save(CardDAV)</th>
                    </tr>
                </thead>
                <tbody>
                    {#each removeOrPushList as meta, i}
                    <tr>
                        <th scope="row">{kaiosContactList[kaiosContactListIndex[meta.kaios]].id}</th>
                        <td>{ kaiosContactList[kaiosContactListIndex[meta.kaios]].name[0] }</td>
                        <td>{ kaiosContactList[kaiosContactListIndex[meta.kaios]].tel[0].value }</td>
                        <td class="col-1">
                            <input type="checkbox" checked={removeOrPushList[i].status} on:click={() => { removeOrPushList[i].status = !removeOrPushList[i].status }}>
                        </td>
                        <td class="col-1">
                            <input type="checkbox" checked={!removeOrPushList[i].status} on:click={() => { removeOrPushList[i].status = !removeOrPushList[i].status }}>
                        </td>
                    </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</div>
