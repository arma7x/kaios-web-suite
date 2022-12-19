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
                    <p>1. If a new contact has been added to KaiOS and you also want to add this new contact to CardDAV</p>
                    <p>2. If any KaiOS contacts have been updated and you also want to apply the update on CardDAV</p>
                    <p>3. If any CardDAV contacts have been removed and you also want to remove these contacts from KaiOS</p>
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
