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
                    <h5 class="modal-title">Use Cases</h5>
                    <button on:click={closeModal} type="button" class="btn-close" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>1. If a new contact has been added to <b>KaiOS</b> and you also want to add this new contact to <b>CardDAV</b></p>
                    <p>2. If any <b>KaiOS</b> contacts have been updated and you also want to apply the update on <b>CardDAV</b></p>
                    <p>3. If any <b>CardDAV</b> contacts have been removed and you also want to remove these contacts from <b>KaiOS</b></p>
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
