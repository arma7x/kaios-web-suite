<script lang="ts">
    import "../../system/global.css";

    import { onMount, onDestroy, beforeUpdate } from 'svelte';
    import { type MozMmsMessage } from '../../../../kaios-app/src/system/sync_protocol';

    export let showSender: bool = false;
    export let senderName: string = "";
    export let message: MozSmsMessage;
    export let deleteCallback: Function = (id) => {};

    onMount(() => {
        console.log(message);
    });

    onDestroy(() => {});

    beforeUpdate(() => {});

</script>

<div class="pure-button" style="max-width:95%;">
  TODO MMS
</div>

<style>
    .pure-button {
        text-align: unset;
    }
    .button-danger {
        background: rgb(202, 60, 60);
        /* this is a maroon */
    }
</style>
