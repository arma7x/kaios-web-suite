<script>
  import { closeModal } from 'svelte-modals'

  // provided by Modals
  export let isOpen

</script>

{#if isOpen}
<div role="dialog" class="modal">
  <div class="contents">
    <h2>Guide</h2>
    <p>1. Please press <b>ENTER</b> after you input the recipient number or click any contact on suggestion list(extracted from KaiOS phonebook) to select the contact as recipient</p>
    <p>2. For group texting(more than one recipients), change the mode from <b>SMS</b> to <b>MMS</b> and please fill in the <b>subject</b> field</p>
    <p>3. When viewing group texting thread, the default <b>subject</b> of reply for group texting thread is the <b>subject</b> of the last message received</p>
    <p>4. If the <b>subject</b> was empty when the user replying to messages in group texting thread, the default value to be used is current UTC time</p>
    <p>5. Please turn on <b>Auto retrieve messages</b> for MMS. The settings available in KaiOS SMS apps</p>
    <div class="actions">
      <button class="pure-button" on:click="{closeModal}">OK</button>
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
    margin-top: 16px;
    font-size: 14px;
  }

  .actions {
    margin-top: 32px;
    display: flex;
    justify-content: flex-end;
  }
</style>
