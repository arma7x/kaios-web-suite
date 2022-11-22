<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { RequestSystemStatus } from '../../../system/protocol';
    import { contactStorage } from '../../../system/stores';
    import { type MozContact, type ContactStore } from '../../../../../kaios-app/src/system/sync_protocol';

    let isKaiOSDeviceConnected: bool = false;
    let contactsUnsubscribe: any;
    let contactList: Array<MozContact> = [];

    function streamEvent(evt) {
        switch (evt.detail.type) {
            case RequestSystemStatus.CONNECTION_STATUS:
                ({ isKaiOSDeviceConnected } = evt.detail.data);
                break;
        }
    }

    onMount(() => {
        window.addEventListener(RequestSystemStatus.STREAM_DOWN, streamEvent);
        const evt = new CustomEvent(RequestSystemStatus.STREAM_UP, {
            detail: {
              type: RequestSystemStatus.CONNECTION_STATUS
            }
        });
        window.dispatchEvent(evt);
        contactsUnsubscribe = contactStorage.subscribe((contactStore: ContactStore = {}) => {
            if (contactStore && contactStore.contacts) {
                contactList = [...contactStore.contacts];
            }
        });
    });

    onDestroy(() => {
        window.removeEventListener(RequestSystemStatus.STREAM_DOWN, streamEvent);
        if (contactsUnsubscribe)
            contactsUnsubscribe();
    });

</script>

<div>
    <h1>KaiOSContacts {.toString()}</h1>
    {#if isKaiOSDeviceConnected }
        { JSON.stringify(contactList) }
    {:else}
        <h5>Not connected</h5>
    {/if}
</div>
