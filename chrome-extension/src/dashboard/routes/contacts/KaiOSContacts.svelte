<script lang="ts">

    import { onMount, onDestroy } from 'svelte';
    import { RequestSystemStatus } from '../../../system/protocol';

    let isKaiOSDeviceConnected: bool = false;

    function streamEvent(evt) {
        switch (evt.detail.type) {
            case RequestSystemStatus.CONNECTION_STATUS:
                ({ isKaiOSDeviceConnected } = evt.detail.data);
                break;
        }
    }

    onMount(() => {
        window.addEventListener(RequestSystemStatus.STREAM_DOWN, streamEvent);
        const evt = new CustomEvent(RequestSystemStatus.STREAM_UP, {
            detail: {
              type: RequestSystemStatus.CONNECTION_STATUS
            }
        });
        window.dispatchEvent(evt);
    });

    onDestroy(() => {
        window.removeEventListener(RequestSystemStatus.STREAM_DOWN, streamEvent);
    });

</script>

<div>
    <h1>KaiOSContacts {isKaiOSDeviceConnected.toString()}</h1>
    <p>
        This sample shows how to dynamically import components. These are modules imported on-demand with the <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import"><code>import()</code> method</a>.<br/>
        Bundlers like Rollup and Webpack support automatic code splitting when you use dynamic imports, so after compiling this sample, in the <code>dist/</code> folder you'll see a bunch of different JavaScript files. At runtime, the browser requests them only when you first navigate to the route (and then they're cached).
    </p>
    <p>This is the Home component, which contains markup only.</p>
    <p><em>Hint:</em> Try navigating with the links below, then use your browser's back and forward buttons.</p>
</div>
