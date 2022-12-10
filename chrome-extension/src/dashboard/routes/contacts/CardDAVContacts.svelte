<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { DAVClient, getBasicAuthHeaders } from 'tsdav/dist/tsdav';
    import { RequestSystemStatus } from '../../../system/protocol';
    import vCard from 'vcf';

    let contactList: Array<{[key: string|number]: any;}> = [];
    let contactListIndex: {[key: string|number]: number;} = {};
    let LIMIT: number = 10;
    let offset: number = 0;
    let maxOffset: number = Math.ceil(contactList.length / LIMIT);

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
                    let temp: Array<{[key: string|number]: any;}> = [];
                    vcards.forEach((contact, index) => {
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
                        contact.mozContact = mozCt;
                        temp.push(contact);
                        contactListIndex[contact.data.data.uid._data] = index;
                    });
                    contactList = [...temp];
                    maxOffset = Math.ceil(contactList.length / LIMIT);
                    // console.log(contactList);
                } catch(err) {
                    console.log(err);
                }
            })();
        }, 3000);
    }


    function addContact() {}

    function updateContact(contact) {}

    function exportContact(contact) {}

    function deleteContact(id: string) {}

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
                    <h6>Page: {offset + 1}/{maxOffset}</h6>
                    <button type="button" class="btn btn-primary btn-sm" on:click={() => {if (offset + 1 < maxOffset) ++offset;} }>
                        Next{#if offset + 1 < maxOffset }({offset + 2}){/if}
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
                    <th scope="row">{contact.data.data.uid._data}</th>
                    <td>{ contact.mozContact.name[0] }</td>
                    <td>{ contact.mozContact.tel[0].value }</td>
                    <td>
                        <div class="mt-2 d-block gap-2">
                            <button class="btn btn-outline-info btn-sm mb-1" on:click={() => updateContact(contact) }>Update</button>
                            <button class="btn btn-outline-dark btn-sm mb-1" on:click={() => exportContact(contact) }>Export</button>
                            <button class="btn btn-outline-danger btn-sm mb-1" on:click={() => deleteContact(contact.id) }>Delete</button>
                        </div>
                    </td>
                </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
