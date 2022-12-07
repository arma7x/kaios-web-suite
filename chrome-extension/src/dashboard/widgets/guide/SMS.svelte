<script>
  import { closeModal } from 'svelte-modals'

  // provided by Modals
  export let isOpen

</script>

{#if isOpen}
    <div class="svelte-modals modal">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Guide</h5>
                    <button on:click={closeModal} type="button" class="btn-close" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>1. Please press <b>ENTER</b> after you input the recipient number or click any contact on suggestion list(extracted from KaiOS phonebook) to select the contact as recipient</p>
                    <p>2. For group texting(more than one recipients), change the mode from <b>SMS</b> to <b>MMS</b> and please fill in the <b>subject</b> field</p>
                    <p>3. When viewing group texting thread, the default <b>subject</b> of reply for group texting thread is the <b>subject</b> of the last message received</p>
                    <p>4. If the <b>subject</b> was empty when the user replying to messages in group texting thread, the default value to be used is current UTC time</p>
                    <p>5. Please turn on <b>Auto retrieve messages</b> for MMS. The settings available in KaiOS SMS apps</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary btn-sm me-2" on:click="{closeModal}">Close</button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
</style>
