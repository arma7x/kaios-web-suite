<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { closeModal } from 'svelte-modals';
    import { type MozContact } from '../../../../kaios-app/src/system/sync_protocol';

    type CallbackFunction = (contact: any) => void

    // provided by Modals
    export let isOpen;
    export let titleText: string;
    export let buttonText: string;
    export let contact: MozContact = {};
    export let callback: CallbackFunction = (contact: any) => {};

    let contactForm;

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
            if (contact.tel == null)
                contact.tel = [];
            if (contact.tel.length == 0)
                contact.tel.push({ "type": [type], "value": val });
            else
                contact.tel[0] = { "type": [type], "value": val };
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
        if (contactForm) {
            if (!contactForm.checkValidity()) {
                contactForm.classList.add('was-validated')
            } else {
                callback(contact);
            }
        }
    }

</script>

{#if isOpen}
<div class="svelte-modals modal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">{titleText}</h5>
                <button on:click={closeModal} type="button" class="btn-close" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form bind:this={contactForm} novalidate>
                    <div class="input-group mb-1">
                        <div class="form-floating">
                            <input id="givenName" class="form-control form-control-sm" placeholder="Enter given name" value="{givenName}" type="text" on:input="{onGivenName}" required/>
                            <label for="givenName">Given Name</label>
                            <div class="invalid-feedback">Required</div>
                        </div>
                    </div>
                    <div class="input-group mb-1">
                        <div class="form-floating">
                            <input id="familyName" class="form-control form-control-sm" placeholder="Enter family name" value="{familyName}" type="text" on:input="{onFamilyName}" />
                            <label for="familyName">Family Name</label>
                        </div>
                    </div>
                    <div class="input-group mb-1">
                        <div class="form-floating">
                            <input id="phoneNumber" class="form-control form-control-sm" placeholder="Enter phone number" value="{phoneNumber}" type="tel" on:input="{onPhoneNumber}" required/>
                            <label for="phoneNumber">Phone Number</label>
                            <div class="invalid-feedback">Required</div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary btn-sm me-2" on:click="{saveContact}">{buttonText}</button>
                <button class="btn btn-primary btn-sm me-2" on:click="{closeModal}">Close</button>
            </div>
        </div>
    </div>
</div>
{/if}

<style>
</style>
