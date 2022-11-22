<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { DAVClient, getBasicAuthHeaders } from 'tsdav/dist/tsdav';
    import { RequestSystemStatus } from '../../../system/protocol';

    onMount(() => {
        console.log('onMount Contacts');
        let config = {
            serverUrl: window.localStorage.getItem('serverUrl'),
            username: window.localStorage.getItem('username'),
            password: window.localStorage.getItem('password')
        }
        console.log(config);
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
                console.log(vcards);
            } catch(err) {
                    console.log(err);
            }
        })();
    });

    onDestroy(() => {
        console.log('onDestroy Contacts');
    });
</script>

<div>
    <h1>CardDAVContacts</h1>
    <p>
        This sample shows how to dynamically import components. These are modules imported on-demand with the <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import"><code>import()</code> method</a>.<br/>
        Bundlers like Rollup and Webpack support automatic code splitting when you use dynamic imports, so after compiling this sample, in the <code>dist/</code> folder you'll see a bunch of different JavaScript files. At runtime, the browser requests them only when you first navigate to the route (and then they're cached).
    </p>
    <p>This is the Home component, which contains markup only.</p>
    <p><em>Hint:</em> Try navigating with the links below, then use your browser's back and forward buttons.</p>
</div>
