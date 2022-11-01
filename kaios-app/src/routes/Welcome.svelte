<script lang="ts">
  import { Route, navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { Peer, type DataConnection } from "peerjs";
  import QRScanner from '../widgets/QRScanner.svelte';
  import SMSSyncHub from '../system/sms_sync_hub';
  import { SyncProtocol } from '../system/sync_protocol';

  export let location: any;
  export let navigate: any;
  export let getAppProp: Function;

  let name: string = 'Welcome';

  const PING_INTERVAL = 3000;

  let peer: Peer;
  let dataConnection: DataConnection;
  let dataConnectionStatus: bool = false;
  let qrScanner: QRScanner;
  let smsSyncHub: SMSSyncHub;
  let connectionLastPing: any = 0;
  let connectionPingInterval: any;

  let navOptions = {
    softkeyLeftListener: function(evt) {},
    softkeyRightListener: function(evt) {
      if (dataConnectionStatus) {
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
      goto('demo');
    },
    backspaceListener: function(evt) {}
  };

  let navInstance = createKaiNavigator(navOptions);

  function setupPeer(id: string) {
    if (dataConnection) {
      dataConnection.close();
    }
    dataConnection = peer.connect(id, { reliable: true });
    dataConnection.on("open", () => {
      dataConnectionStatus = true;
      // console.log("[SLAVE] open", dataConnectionStatus, dataConnection.open); // SLAVE CONNECTED TO MASTER
      if (dataConnectionStatus && dataConnection && dataConnection.open) {
        dataConnection.send({ type: SyncProtocol.PING });
        connectionPingInterval = setInterval(() => {
          const diff = new Date().getTime() - connectionLastPing;
          if (diff > PING_INTERVAL + 57000) {
            clearInterval(connectionPingInterval);
            dataConnectionStatus = false;
            try {
              if (dataConnection && dataConnection.open) {
                dataConnection.close();
              }
            } catch (err) {}
            peer.destroy();
            peer.disconnect();
            dataConnection = null;
            initPeer();
            alert(diff);
          }
        }, PING_INTERVAL);
      }
    });
    dataConnection.on("data", (data) => {
      // console.log("[SLAVE] recv data:", data);
      try {
        if (data && data.type == SyncProtocol.PONG) {
          connectionLastPing = new Date().getTime();
          setTimeout(() => {
            if (dataConnectionStatus && dataConnection && dataConnection.open) {
              dataConnection.send({ type: SyncProtocol.PING });
            }
          }, PING_INTERVAL);
        }
      } catch (err) {
        console.log(err);
      }
      smsSyncHub.filterEvent(data);
    });
    dataConnection.on("disconnected", () => {
      dataConnectionStatus = false;
      if (connectionPingInterval) {
        clearInterval(connectionPingInterval);
      }
      // console.log("[SLAVE] disconnected");
    });
    dataConnection.on("close", () => {
      dataConnectionStatus = false;
      if (connectionPingInterval) {
        clearInterval(connectionPingInterval);
      }
      // console.log("[SLAVE] close"); // MASTER DC
    });
    dataConnection.on("error", (err) => {
      console.log("[SLAVE] error", err);
    });
  }

  function initPeer() {
    peer = new Peer({ debug: 0, referrerPolicy: "origin-when-cross-origin" });
    peer.on("disconnected", () => {
      dataConnectionStatus = false;
      if (connectionPingInterval) {
        clearInterval(connectionPingInterval);
      }
      // console.log("[peer.SLAVE] disconnected");
    });
    peer.on("close", () => {
      dataConnectionStatus = false;
      if (connectionPingInterval) {
        clearInterval(connectionPingInterval);
      }
      // console.log("[peer.SLAVE] close");
    });
    peer.on("error", (err) => {
      console.log("[peer.SLAVE] error", error);
    });
  }

  const broadcastCallback = (data) => {
    if (dataConnectionStatus && dataConnection && dataConnection.open) {
      dataConnection.send(data);
    }
  }

  onMount(() => {
    const { appBar, softwareKey } = getAppProp();
    appBar.setTitleText(name);
    softwareKey.setText({ left: 'LSK', center: 'DEMO', right: 'Scan' });
    navInstance.attachListener();
    initPeer();
    smsSyncHub = new SMSSyncHub(broadcastCallback);
  });

  onDestroy(() => {
    navInstance.detachListener();
  });

</script>

<main id="welcome-screen" data-pad-top="28" data-pad-bottom="30">
  <h1>Hello {name}!</h1>
  <h4>Status: {#if dataConnectionStatus}Connected{:else}Disconnected{/if}</h4>
</main>

<style>
  #welcome-screen {
    overflow: scroll;
    width: 100%;
  }
</style>
