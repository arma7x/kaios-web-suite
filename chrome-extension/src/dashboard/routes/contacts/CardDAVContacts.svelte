<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { DAVClient, getBasicAuthHeaders } from 'tsdav/dist/tsdav';
    import { RequestSystemStatus } from '../../../system/protocol';
    import vCard from 'vcf';

    let contactList: {[key: string|number]: any;} = {};

    function getContact() {
        contactList = [];
        setTimeout(() => {
            let config = {
                serverUrl: window.localStorage.getItem('serverUrl'),
                username: window.localStorage.getItem('username'),
                password: window.localStorage.getItem('password')
            }

            const client = new DAVClient({
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
                    await client.login();
                    const addressBooks = await client.fetchAddressBooks();
                    const vcards = await client.fetchVCards({
                        addressBook: addressBooks[0],
                    });
                    let temp: {[key: string|number]: any;} = {};
                    vcards.forEach(contact => {
                        const splitURL = contact.url.split('/');
                        temp[splitURL[splitURL.length - 1]] = contact;
                        contact.data = new vCard().parse(contact.data);
                        const { fn, n, tel } = contact.data.data;
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
                        // console.log(splitURL[splitURL.length - 1], mozCt);
                    });
                    contactList = {...temp};
                } catch(err) {
                    console.log(err);
                }
            })();
        }, 3000);
    }

    function updateContact() {}

    function deleteContact() {}

    onMount(() => {
        console.log('onMount Contacts');
        getContact();
    });

    onDestroy(() => {
        console.log('onDestroy Contacts');
    });
</script>

<div>
    <h1>CardDAVContacts</h1>
    <div><button on:click={getContact}>getContact</button></div>
    {#each Object.entries(contactList) as [key, contact]}
        <div style="margin-bottom:4px;">{key}: { contact.data.data.fn._data }, { contact.data.data.tel.length ? contact.data.data.tel[0]._data : contact.data.data.tel._data }</div>
    {/each}
</div>
