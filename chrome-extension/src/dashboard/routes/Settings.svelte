<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    let serverUrl: string = '';
    let username: string = '';
    let password: string = '';

    function save() {
        window.localStorage.setItem('serverUrl', serverUrl);
        window.localStorage.setItem('username', username);
        window.localStorage.setItem('password', password);
    }

    onMount(() => {
        console.log('onMount Settings');
        serverUrl = window.localStorage.getItem('serverUrl') || '';
        username = window.localStorage.getItem('username') || '';
        password = window.localStorage.getItem('password') || '';
    });

    onDestroy(() => {
        console.log('onDestroy Settings');
    });
</script>

<div>
    <h1>Settings</h1>
    <div>
        <input bind:value={serverUrl} />
    </div>
    <div>
        <input bind:value={username} />
    </div>
    <div>
        <input bind:value={password} />
    </div>
    <div>
        <button on:click={save}>Save</button>
    </div>
</div>
