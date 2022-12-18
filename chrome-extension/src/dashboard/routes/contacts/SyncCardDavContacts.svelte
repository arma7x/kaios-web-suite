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

    let tabIndex: number = 0;
    let isRefresh: boolean = false;
    let isSync: boolean = false;

    let isKaiOSDeviceConnected: bool = false;
    let kaiosContactsUnsubscribe: any;
    let kaiosContactList: Array<MozContact> = [];
    let kaiosContactListIndex: {[key: string|number]: number;} = {};
    let kaiosContactKeyIndex: {[key: string|number]: number;} = {};

    let davClient: DAVClient;
    let addressBooks: Array<any> = [];
    let davContactList: Array<{[key: string|number]: any;}> = [];
    let davContactListIndex: {[key: string|number]: number;} = {};

    let skipOrUpdateList: Array<_Contact> = [];
    let removeOrPushList: Array<_Contact> = [];

    function streamEvent(evt) {
        switch (evt.detail.type) {
            case ChromeSystemEvent.CONNECTION_STATUS:
                ({ isKaiOSDeviceConnected } = evt.detail.data);
                break;
            case SyncProtocol.SYNC_CONTACT_CARDDAV_KAIOS:
                // console.log(evt.detail);
                isSync = false;
                tabIndex = 0;
                getKaiOSContact();
                break;
        }
    }

    function getKaiOSContact() {
        kaiosContactList = [];
        kaiosContactListIndex = {};
        kaiosContactKeyIndex = {};
        davContactList = [];
        davContactListIndex = {};
        skipOrUpdateList = [];
        removeOrPushList = [];
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

    async function getDAVContact() {
        isRefresh = true;
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
        try {
            await davClient.login();
            addressBooks = await davClient.fetchAddressBooks();
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
            let temp1 = [];
            let temp2 = [];
            Object.keys(davContactListIndex).forEach((key) => {
                if (kaiosContactKeyIndex[key] != null)
                    temp1.push({ kaios: kaiosContactList[kaiosContactKeyIndex[key]].id, carddav: key, status: true });
                else
                    temp2.push({ kaios: null, carddav: key, status: false });
            });
            skipOrUpdateList = [...temp1];
            removeOrPushList = [...temp2];
        } catch(err) {
            console.log(err);
        }
        isRefresh = false;
    }

    function invertSkipOrUpdateList() {
        skipOrUpdateList.forEach((c, i) => {
            skipOrUpdateList[i].status = !skipOrUpdateList[i].status;
        });
    }

    function invertRemoveOrPushList() {
        removeOrPushList.forEach((c, i) => {
            removeOrPushList[i].status = !removeOrPushList[i].status;
        });
    }

    async function sync() {
        isSync = true;
        let saveList = [];
        let updateList = {};
        for (let i in skipOrUpdateList) {
            const c = skipOrUpdateList[i];
            if (!c.status)
                updateList[kaiosContactList[kaiosContactListIndex[c.kaios]].id] = davContactList[davContactListIndex[c.carddav]].mozContact;
        }
        for (let i in removeOrPushList) {
            const c = removeOrPushList[i];
            if (c.status === true)
                await davClient.deleteVCard({
                    vCard: {
                        url: davContactList[davContactListIndex[c.carddav]].url,
                        etag: davContactList[davContactListIndex[c.carddav]].etag
                    }
                });
            else {
                davContactList[davContactListIndex[c.carddav]].mozContact.key = [c.carddav];
                saveList.push(davContactList[davContactListIndex[c.carddav]].mozContact);
            }
        }
        const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
            detail: {
                type: SyncProtocol.SYNC_CONTACT_CARDDAV_KAIOS,
                data: {
                    saveList: saveList,
                    updateList: updateList,
                }
            }
        });
        window.dispatchEvent(evt);
    }

    onMount(() => {
        window.addEventListener(ChromeSystemEvent.STREAM_DOWN, streamEvent);
        window.addEventListener(SyncProtocol.STREAM_DOWN, streamEvent);
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
        window.removeEventListener(SyncProtocol.STREAM_DOWN, streamEvent);
        if (kaiosContactsUnsubscribe)
            kaiosContactsUnsubscribe();
    });

</script>

<div>
    <div class="d-flex flex-row justify-content-between align-items-center">
        <h3>Sync CardDAV Contacts</h3>
        <div class="d-flex flex-row">
            <button type="button" class="btn btn-primary btn-sm me-1" on:click={getKaiOSContact}>
                {#if (isRefresh)}<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>{/if} Refresh
            </button>
            <button type="button" class="btn btn-primary btn-sm" on:click={sync}>
                {#if (isSync)}<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>{/if} Sync
            </button>
        </div>
    </div>
    <nav>
        <div class="nav nav-tabs" id="nav-tab" role="tablist">
            <button on:click={() => {tabIndex = 0}} class="nav-link {tabIndex == 0 ? 'active' : ''}" id="nav-update-tab" data-bs-toggle="tab" data-bs-target="#nav-update" type="button" role="tab" aria-controls="nav-update" aria-selected="true">Apply update to KaiOS</button>
            <button on:click={() => {tabIndex = 1}} class="nav-link {tabIndex == 1 ? 'active' : ''}" id="nav-push-tab" data-bs-toggle="tab" data-bs-target="#nav-push" type="button" role="tab" aria-controls="nav-push" aria-selected="false">Save CardDAV contacts to KaiOS</button>
        </div>
    </nav>
    <div class="tab-content" id="nav-tabContent">
        <div class="tab-pane fade {tabIndex == 0 ? 'show active' : ''}" id="nav-update" role="tabpanel" aria-labelledby="nav-update-tab">
            <div class="table-responsive">
                <table class="table caption-top">
                    <caption>
                        <div class="d-flex flex-row justify-content-end align-items-center">
                            <button type="button" class="btn btn-primary btn-sm" on:click={invertSkipOrUpdateList}>Invert Selection</button>
                        </div>
                    </caption>
                    <thead>
                        <tr>
                            <th scope="col">#</th>
                            <th scope="col">Name</th>
                            <th scope="col">Phone Number</th>
                            <th scope="col" class="col-1">Skip</th>
                            <th scope="col" class="col-1">Update(KaiOS)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each skipOrUpdateList as meta, i}
                        <tr>
                            <th scope="row">{davContactList[davContactListIndex[meta.carddav]].mozContact.id}</th>
                            <td>{ davContactList[davContactListIndex[meta.carddav]].mozContact.name[0] }</td>
                            <td>{ davContactList[davContactListIndex[meta.carddav]].mozContact.tel[0].value }</td>
                            <td class="col-1">
                                <input type="checkbox" checked={skipOrUpdateList[i].status} on:click={() => { skipOrUpdateList[i].status = !skipOrUpdateList[i].status }}>
                            </td>
                            <td class="col-1">
                                <input type="checkbox" checked={!skipOrUpdateList[i].status} on:click={() => { skipOrUpdateList[i].status = !skipOrUpdateList[i].status }}>
                            </td>
                        </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="tab-pane fade {tabIndex == 1 ? 'show active' : ''}" id="nav-push" role="tabpanel" aria-labelledby="nav-push-tab">
            <div class="table-responsive">
                <table class="table caption-top">
                    <caption>
                        <div class="d-flex flex-row justify-content-end align-items-center">
                            <button type="button" class="btn btn-primary btn-sm" on:click={invertRemoveOrPushList}>Invert Selection</button>
                        </div>
                    </caption>
                    <thead>
                        <tr>
                            <th scope="col">#</th>
                            <th scope="col">Name</th>
                            <th scope="col">Phone Number</th>
                            <th scope="col" class="col-1">Remove(CardDAV)</th>
                            <th scope="col" class="col-1">Save(KaiOS)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each removeOrPushList as meta, i}
                        <tr>
                            <th scope="row">{davContactList[davContactListIndex[meta.carddav]].mozContact.id}</th>
                            <td>{ davContactList[davContactListIndex[meta.carddav]].mozContact.name[0] }</td>
                            <td>{ davContactList[davContactListIndex[meta.carddav]].mozContact.tel[0].value }</td>
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
</div>
