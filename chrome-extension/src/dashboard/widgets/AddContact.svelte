<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { closeModal } from 'svelte-modals';
    import { SyncProtocol, type MozContact } from '../../../../kaios-app/src/system/sync_protocol';

    // provided by Modals
    export let isOpen;
    export let title: string;
    export let contact: MozContact = {};

    let givenName: string = '';
    let familyName: string = '';
    let phoneNumber: string = '';
    let type: string = 'mobile';

    onMount(() => {
        if (contact && contact.givenName != null && contact.givenName.length > 0)
            givenName = contact.givenName[0]
        if (contact && contact.familyName != null && contact.familyName.length > 0)
            familyName = contact.familyName[0]
        if (contact && contact.tel != null && contact.tel.length > 0) {
            phoneNumber = contact.tel[0].value
            type = contact.tel[0].type != null && contact.tel[0].type.length > 0 ? contact.tel[0].type[0] : type
        }
    })

    function onGivenName(evt) {
        const val = evt.target.value.trim().toString();
        if (val)
            contact.givenName = [val]
        else
            contact.givenName = null
        updateName()
    }

    function onFamilyName(evt) {
        const val = evt.target.value.trim().toString();
        if (val)
            contact.familyName = [val]
        else
            contact.familyName = null
        updateName()
    }

    function onPhoneNumber(evt) {
        const val = evt.target.value.trim().toString();
        if (val) {
            contact.tel = [{ "type": [type], "value": val }]
        } else {
            contact.tel = null
        }
        updateName()
    }

    function updateName() {
        let name = [];
        if (contact.givenName != null && contact.givenName.length === 0)
            contact.givenName = null
        if (contact.familyName != null && contact.familyName.length === 0)
            contact.familyName = null
        if (contact.tel != null && contact.tel.length === 0)
            contact.tel = null
        if (contact.givenName != null && contact.givenName.length > 0)
            name.push(contact.givenName[0])
        if (contact.familyName != null && contact.familyName.length > 0)
            name.push(contact.familyName[0])
        if (name.length > 0)
          contact.name = [name.join(' ')]
        else
            contact.name = null
    }

    function saveContact() {
        const evt = new CustomEvent(SyncProtocol.STREAM_UP, {
            detail: {
              type: SyncProtocol.CONTACT_SAVE,
              data: { contact: contact }
            }
        });
        window.dispatchEvent(evt);
    }

</script>

{#if isOpen}
<div role="dialog" class="modal">
    <div class="contents">
        <h2>{title}</h2>
        <div>
            <input label="Given Name" placeholder="Enter given name" value="{givenName}" type="text" on:input="{onGivenName}" />
            <input label="Family Name" placeholder="Enter family name" value="{familyName}" type="text" on:input="{onFamilyName}" />
            <input label="Phone Number" placeholder="Enter phone number" value="{phoneNumber}" type="tel" on:input="{onPhoneNumber}" />
        </div>
        <div>
            { JSON.stringify(contact) }
        </div>
        <div class="actions">
            <button on:click="{saveContact}">Save</button>
            <button on:click="{closeModal}">Close</button>
        </div>
    </div>
</div>
{/if}

<style>
  .modal {
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;

    /* allow click-through to backdrop */
    pointer-events: none;
  }

  .contents {
    min-width: 240px;
    border-radius: 6px;
    padding: 16px;
    background: white;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: auto;
  }

  h2 {
    text-align: center;
    font-size: 24px;
  }

  p {
    text-align: center;
    margin-top: 16px;
  }

  .actions {
    margin-top: 32px;
    display: flex;
    justify-content: flex-end;
  }
</style>
