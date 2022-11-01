<script lang="ts">
  import { Route, navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { Peer, type DataConnection } from "peerjs";
  import QRScanner from '../widgets/QRScanner.svelte';

  export let location: any;
  export let navigate: any;
  export let getAppProp: Function;

  let name: string = 'Welcome';

  let peer: Peer;
  let dataConnection: DataConnection;
  let dataConnectionStatus: bool = false;
  let qrScanner: QRScanner;

  let navOptions = {
    verticalNavClass: 'vertClass',
    horizontalNavClass: 'horzClass',
    softkeyLeftListener: function(evt) {
      console.log('softkeyLeftListener', name);
    },
    softkeyRightListener: function(evt) {
      if (dataConnectionStatus && dataConnectionStatus.open) {
        return;
      }
      qrScanner = new QRScanner({
        target: document.body,
        props: {
          title: 'Scan QR Code',
          onBackspace: (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            qrScanner.$destroy();
          },
          onOpened: () => {
            navInstance.detachListener();
          },
          onClosed: () => {
            navInstance.attachListener();
            qrScanner = null;
          },
          callback: (token) => {
            qrScanner.$destroy();
            setupPeer(token.data);
          }
        }
      });
    },
    enterListener: function(evt) {
      console.log('enterListener', name);
      goto('demo');
    },
    backspaceListener: function(evt) {
      console.log('backspaceListener', name);
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  function setupPeer(id: string) {
    if (dataConnection) {
      dataConnection.close();
    }
    dataConnection = peer.connect(id, { reliable: true });
    dataConnection.on("open", () => {
      dataConnectionStatus = true;
      console.log("[SLAVE] open"); // SLAVE CONNECTED TO MASTER
    });
    dataConnection.on("data", (data) => {
      console.log("[SLAVE] recv data:", data);
      setTimeout(() => {
        console.log("[SLAVE] Send Ping");
        dataConnection.send("Ping from slave");
      }, 2000);
    });
    dataConnection.on("disconnected", () => {
      dataConnectionStatus = false;
      console.log("[SLAVE] disconnected");
    });
    dataConnection.on("close", () => {
      dataConnectionStatus = false;
      console.log("[SLAVE] close"); // MASTER DC
    });
    dataConnection.on("error", (err) => {
      console.log("[SLAVE] error", err);
      alert(err.toString());
    });
  }

  onMount(() => {
    console.log('onMount', name);
    const { appBar, softwareKey } = getAppProp();
    appBar.setTitleText(name);
    softwareKey.setText({ left: 'LSK', center: 'DEMO', right: 'Scan' });
    navInstance.attachListener();
    peer = new Peer({ debug: 0, referrerPolicy: "origin-when-cross-origin" });
  });

  onDestroy(() => {
    console.log('onDestroy', name);
    navInstance.detachListener();
  });

</script>

<main id="welcome-screen" data-pad-top="28" data-pad-bottom="30">
  <h1>Hello {name}!</h1>
  <div class="vertical">
    <div class="vertClass">Vertical 1</div>
    <div class="vertClass">Vertical 2</div>
  </div>
  <div class="horizontal">
    <div style="flex:1;" class="horzClass">Horizontal 1</div>
    <div style="flex:1;" class="horzClass">Horizontal 2</div>
  </div>
</main>

<style>
  #welcome-screen {
    overflow: scroll;
    width: 100%;
  }
  #welcome-screen > .vertical {
    display:flex;
    flex-direction:column;
  }
  #welcome-screen > .horizontal {
    width:100%;
    display:flex;
    flex-direction:row;
  }
  :global(#welcome-screen > .vertical > .vertClass)
  :global(#welcome-screen > .vertical > .horizontal) {
    background-color: #ffffff;
    color: #000000;
  }
  :global(#welcome-screen > .vertical > .vertClass.focus),
  :global(#welcome-screen > .horizontal > .horzClass.focus) {
    background-color: red!important;
    color: #fff!important;
  }
</style>
