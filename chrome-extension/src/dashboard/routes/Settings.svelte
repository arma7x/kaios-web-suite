<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    let serverUrl: string = '';
    let username: string = '';
    let password: string = '';

    let passwordRef;

    function save() {
        window.localStorage.setItem('serverUrl', serverUrl);
        window.localStorage.setItem('username', username);
        window.localStorage.setItem('password', password);
        const rules  = {
            addRules: [
                {
                    id: 9997,
                    priority: 1,
                    action: {
                        type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
                        requestHeaders: [
                            {
                            header: 'user-agent',
                            operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
                            value: `Mozilla/5.0 (Windows) mirall/3.0.1`,
                            },
                        ],
                    },
                    condition: {
                        urlFilter: new URL(serverUrl).origin,
                        resourceTypes: [
                            'xmlhttprequest' as chrome.declarativeNetRequest.ResourceType,
                        ]
                    },
                },
            ],
            removeRuleIds: [9997]
        }

        chrome.declarativeNetRequest.updateDynamicRules(rules, () => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError)
            } else {
                chrome.declarativeNetRequest.getDynamicRules(rules => console.log(rules))
            }
        })
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
    <div class="mb-2">
        <label for="serverUrl" class="form-label">Server</label>
        <input id="serverUrl" type="text" class="form-control" bind:value={serverUrl} />
    </div>
    <div class="mb-2">
        <label for="username" class="form-label">Email Address/Username</label>
        <input id="username" type="text" class="form-control" bind:value={username} />
    </div>
    <div class="mb-2">
        <label for="password" class="form-label">Password</label>
        <input bind:this={passwordRef} id="password" type="password" class="form-control" bind:value={password} />
    </div>
    <div class="d-flex flex-row">
        <button class="btn btn-sm btn-primary me-1" on:click={save}>Save</button>
        <button class="btn btn-sm btn-primary" on:click={() => {
            if (passwordRef.type === "password")
                passwordRef.type = "text";
            else
                passwordRef.type = "password";
        }}>Password Visibility</button>
    </div>
</div>
