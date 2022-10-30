<script lang="ts">
  import { Route, navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { Peer, type DataConnection } from "peerjs";

  export let location: any;
  export let navigate: any;
  export let getAppProp: Function;

  let name: string = 'Welcome';

  let peer: Peer;
  let conn: DataConnection;

  let navOptions = {
    verticalNavClass: 'vertClass',
    horizontalNavClass: 'horzClass',
    softkeyLeftListener: function(evt) {
      console.log('softkeyLeftListener', name);
      let id = prompt('Enter id');
      if (conn) {
        conn.close();
      }
      conn = peer.connect(id, { reliable: true });
      conn.on("open", () => {
        console.log("[SLAVE] open"); // SLAVE CONNECTED TO MASTER
      });
      conn.on("data", (data) => {
        console.log("[SLAVE] recv data:", data);
        setTimeout(() => {
          console.log("[SLAVE] Send Ping");
          conn.send("Ping from slave");
        }, 2000);
      });
      conn.on("disconnected", () => {
        console.log("[SLAVE] disconnected");
      });
      conn.on("close", () => {
        console.log("[SLAVE] close"); // MASTER DC
      });
      conn.on("error", (err) => {
        console.log("[SLAVE] error", err);
      });
    },
    softkeyRightListener: function(evt) {
      console.log('softkeyRightListener', name);
      peer = new Peer({ debug: 0, referrerPolicy: "origin-when-cross-origin" });
      peer.on("open", (id) => {
        console.log("[MASTER] open", id);
      });
      peer.on("connection", (_conn) => {  // SLAVE CONNECTED TO MASTER
        conn = _conn;
        console.log("[MASTER] connection");
        setTimeout(() => {
          console.log("[MASTER] Send Ping");
          conn.send("Ping from master");
        }, 2000);
        conn.on("data", (data) => {
          console.log("[MASTER] recv data:", data);
        });
        conn.on("disconnected", () => {
          console.log("[MASTER] disconnected");
        });
        conn.on("close", () => {
          console.log("[MASTER] close"); // SLAVE DC
        });
        conn.on("error", (err) => {
          console.log("[MASTER] error", err);
        });
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

  onMount(() => {
    console.log('onMount', name);
    const { appBar, softwareKey } = getAppProp();
    appBar.setTitleText(name);
    softwareKey.setText({ left: 'SLAVE', center: 'DEMO', right: 'MASTER' });
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
