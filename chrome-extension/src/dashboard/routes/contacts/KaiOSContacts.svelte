<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { RequestSystemStatus } from '../../../system/protocol';
    import { contactStorage } from '../../../system/stores';
    import { SyncProtocol, type MozContact, type ContactStore } from '../../../../../kaios-app/src/system/sync_protocol';

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

    function getContact() {
        contactList = [];
        setTimeout(() => {
            const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
                detail: {
                    type: SyncProtocol.CONTACT_GET_ALL,
                    data: { filter: {} }
                }
            });
            window.dispatchEvent(evt);
        }, 3000);
    }

    function updateContact() {}

    function deleteContact() {}

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
    <h1>KaiOS Contacts</h1>
    {#if isKaiOSDeviceConnected }
        <div><button on:click={getContact}>getContact</button></div>
        <div>{ JSON.stringify(contactList) }</div>
    {:else}
        <h5>Not connected</h5>
    {/if}
</div>
