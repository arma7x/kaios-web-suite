<script lang="ts">
    import "../../system/global.css";

    import { onMount, onDestroy, beforeUpdate } from 'svelte';
    import { MozSmsMessage } from '../../../../kaios-app/src/system/sync_protocol';

    export let showSender: bool = false;
    export let senderName: string = "";
    export let message: MozSmsMessage;
    export let deleteCallback: Function = (id) => {};

    onMount(() => {});

    onDestroy(() => {});

    beforeUpdate(() => {});

</script>

<div class="pure-button wrapword" style="max-width:95%;">
  {#if showSender}
    <p>{senderName}</p>
  {/if}
  <p class="wrapword">{ message.body }</p>
  <div style="display:flex;flex-direction:row;align-items:center;">
      <small>{@html message.delivery == "error" ? "&#9888;" : "" }</small>
      <small>{new Date(message.timestamp).toLocaleString()}</small>
      <button on:click={() => deleteCallback(message.id)} class="button-danger pure-button">DELETE</button>
  </div>
</div>

<style>
    .pure-button {
        text-align: unset;
    }
    .button-danger {
        background: rgb(202, 60, 60);
        margin-left: 0.5em;
    }
</style>
