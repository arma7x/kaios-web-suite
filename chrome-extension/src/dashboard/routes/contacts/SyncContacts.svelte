<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { RequestSystemStatus } from '../../../system/protocol';
    import { contactStorage } from '../../../system/stores';
    import { SyncProtocol, type MozContact, type ContactStore } from '../../../../../kaios-app/src/system/sync_protocol';
    import { DAVClient } from 'tsdav/dist/tsdav';
    import vCard from 'vcf';
    import {v4 as uuidv4} from 'uuid';

    enum MODE {
        NONE            = "NONE",
        KAIOS_CARDDAV   = "KAIOS_CARDDAV",
        CARDDAV_KAIOS   = "CARDDAV_KAIOS",
    }

    interface _Contact {
        kaios: string,
        carddav: string,
        status: boolean,
    }

    let mode: MODE = MODE.NONE;

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
            case RequestSystemStatus.CONNECTION_STATUS:
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
                if (mode !== MODE.NONE && mode === MODE.KAIOS_CARDDAV) {
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
                    console.log(mode, skipOrUpdateList, removeOrPushList);
                } else if (mode !== MODE.NONE && mode === MODE.CARDDAV_KAIOS) {
                    skipOrUpdateList = [];
                    removeOrPushList = [];
                    Object.keys(davContactListIndex).forEach((key) => {
                        if (kaiosContactKeyIndex[key])
                            skipOrUpdateList.push({ kaios: kaiosContactList[kaiosContactKeyIndex[key]].id, carddav: key, status: false });
                        else
                            removeOrPushList.push({ kaios: null, carddav: key, status: false });
                    });
                    console.log(mode, skipOrUpdateList, removeOrPushList);
                }
            } catch(err) {
                console.log(err);
            }
        })();
    }

    function KaiOSToCardDav() {
        mode = MODE.KAIOS_CARDDAV;
        getKaiOSContact();
    }

    function CardDavToKaiOS() {
        mode = MODE.CARDDAV_KAIOS;
        getKaiOSContact();
    }

    onMount(() => {
        window.addEventListener(RequestSystemStatus.STREAM_DOWN, streamEvent);
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
        window.removeEventListener(RequestSystemStatus.STREAM_DOWN, streamEvent);
        if (kaiosContactsUnsubscribe)
            kaiosContactsUnsubscribe();
    });
</script>

<div>
    <h1>Sync Contacts</h1>
    <div>
        <button on:click={KaiOSToCardDav}>KaiOS -> CardDAV</button>
        <button on:click={CardDavToKaiOS}>CardDAV -> KaiOS</button>
    </div>
</div>
