<script lang="ts">
    import "../../system/global.css";

    import { onMount, onDestroy, beforeUpdate } from 'svelte';
    import { type MozSmsMessage } from '../../../../kaios-app/src/system/sync_protocol';

    export let showSender: bool = false;
    export let senderName: string = "";
    export let message: MozSmsMessage;
    export let deleteCallback: Function = (id) => {};

    onMount(() => {});

    onDestroy(() => {});

    beforeUpdate(() => {});

</script>

<div class="p-1 border border-dark rounded" style="max-width:95%;">
  {#if showSender}
    <p>{senderName}</p>
  {/if}
  <p class="text-wrap">{ message.body }</p>
  <div class="d-flex flex-row align-items-center">
      <small class="me-1">{@html message.delivery == "error" ? "&#9888;" : "" }</small>
      <small class="me-1">{new Date(message.timestamp).toLocaleString()}</small>
      <button on:click={() => deleteCallback(message.id)} class="btn btn-outline-danger btn-sm">DELETE</button>
  </div>
</div>

<style>
</style>
