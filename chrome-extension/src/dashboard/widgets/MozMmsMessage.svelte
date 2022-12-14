<script lang="ts">
    import "../../system/global.css";

    import { onMount, onDestroy, beforeUpdate } from 'svelte';
    import { type MozMmsMessage } from '../../../../kaios-app/src/system/sync_protocol';

    export let showSender: bool = false;
    export let senderName: string = "";
    export let message: MozSmsMessage;
    export let deleteCallback: Function = (id) => {};
    export let registerUpdateCallback: Function = (id, fn) => {};

    enum ElementType {
        Image   = 'image',
        Video   = 'video',
        Text    = 'text',
        Unknown = 'unknown',
    }

    interface Element {
        data: string,
        type: ElementType,
    }

    let elements: Array<Element> = [];

    function getBase64(attachment): Promise<Element|void> {
        return new Promise((resolve, reject) => {
            let type = ElementType.Unknown;
            let mime = attachment.type.split('/');
            if (mime.length == 2) {
                switch (mime[0]) {
                    case ElementType.Image:
                        type = ElementType.Image;
                        break
                    case ElementType.Video:
                        type = ElementType.Video;
                        break
                    case ElementType.Text:
                        type = ElementType.Text;
                        break
                }
            }
            let reader = new FileReader();
            let blob = new Blob([attachment.content], {type: attachment.type});
            if (type === ElementType.Text)
                reader.readAsText(blob);
            else
                reader.readAsDataURL(blob);
            reader.onloadend = function() {
              resolve({ data: reader.result, type });
            }
            reader.onerror = function(err) {
              resolve(err);
            }
        });
    }

    async function updateCallback() {
        let temp: Array<Element> = [];
        for (let i in message.attachments) {
            try {
                temp.push(await getBase64(message.attachments[i]));
            } catch (err) {
                console.log(err);
            }
        }
        elements = [...temp];
    }

    onMount(() => {
        registerUpdateCallback(message.id, updateCallback);
        updateCallback();
    });

    onDestroy(() => {});

    beforeUpdate(async () => {

    });

</script>

<svelte:options accessors immutable={true}/>

<div class="p-1 border border-dark rounded" style="max-width:95%;">
  {#if showSender}
    <p>{senderName}</p>
  {/if}
  <p class="text-wrap">{ message.subject }</p>
  <div class="elements">
        {#each elements as element}
            {#if element.type === ElementType.Image}
                <img src={element.data} />
            {:else if element.type === ElementType.Video}
                <video src={element.data}  controls />
            {:else if element.type === ElementType.Text}
                <div class="text">{element.data}</div>
            {:else}
                <div class="unknown">{ElementType.Text.toUpperCase()}</div>
            {/if}
        {/each}
  </div>
  <div class="mt-1 d-flex flex-row align-items-center">
      <small class="me-1">{@html message.delivery == "error" ? "&#9888;" : "" }</small>
      <small class="me-1">{new Date(message.timestamp).toLocaleString()}</small>
      <button on:click={() => deleteCallback(message.id)} class="btn btn-outline-danger btn-sm">DELETE</button>
  </div>
</div>

<style>
    .elements > video,
    .elements > img {
        width: auto;
        height: 200px;
        margin-top: 0.5em;
    }
    .elements > .text {
        margin-bottom: 0.5em;
    }
    .elements > .unknown {
        font-weight: bold;
        color: rgb(202, 60, 60);
    }
</style>
