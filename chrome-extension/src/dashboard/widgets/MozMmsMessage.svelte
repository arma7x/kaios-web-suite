<script lang="ts">
    import "../../system/global.css";

    import { onMount, onDestroy, beforeUpdate } from 'svelte';
    import { type MozMmsMessage } from '../../../../kaios-app/src/system/sync_protocol';

    export let showSender: bool = false;
    export let senderName: string = "";
    export let message: MozSmsMessage;
    export let deleteCallback: Function = (id) => {};

    function getBase64(attachment): Promise<string|void> {
        return new Promise((resolve, reject) => {
            let reader = new FileReader();
            let blob = new Blob([attachment.content], {type: attachment.type});
            reader.readAsDataURL(blob);
            reader.onloadend = function() {
              resolve(reader.result);
            }
            reader.onerror = function(err) {
              resolve(err);
            }
        });
    }

    onMount(() => {
        message.attachments.forEach(async (attachment) => {
            try {
                console.log(attachment, await getBase64(attachment));
            } catch (err) {
                console.log(err);
            }
        });
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
