<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    let serverUrl: string = '';
    let username: string = '';
    let password: string = '';

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
