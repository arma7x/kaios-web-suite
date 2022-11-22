// vite.config.ts
import { crx } from "file:///home/arma7x/Desktop/New/kaios/kaios-web-suite/chrome-extension/node_modules/@crxjs/vite-plugin/dist/index.mjs";
import { svelte } from "file:///home/arma7x/Desktop/New/kaios/kaios-web-suite/chrome-extension/node_modules/@sveltejs/vite-plugin-svelte/dist/index.js";
import nodePolyfills from "file:///home/arma7x/Desktop/New/kaios/kaios-web-suite/chrome-extension/node_modules/rollup-plugin-node-polyfills/dist/index.js";
import { resolve } from "node:path";
import { defineConfig } from "file:///home/arma7x/Desktop/New/kaios/kaios-web-suite/chrome-extension/node_modules/vite/dist/node/index.js";

// manifest.json
var manifest_default = {
  name: "KaiOS Web Suite",
  homepage_url: "https://github.com/arma7x/kaios-web-suite",
  description: "PC Suite for KaiOS",
  version: "1.0",
  manifest_version: 3,
  icons: {
    "16": "src/assets/icons/get_started16.png",
    "32": "src/assets/icons/get_started32.png",
    "48": "src/assets/icons/get_started48.png",
    "128": "src/assets/icons/get_started128.png"
  },
  background: {
    service_worker: "src/background/index.ts"
  },
  action: {
    default_popup: "src/popup/popup.html",
    default_title: "KaiOS Web Suite",
    default_icon: {
      "16": "src/assets/icons/get_started16.png",
      "32": "src/assets/icons/get_started32.png",
      "48": "src/assets/icons/get_started48.png",
      "128": "src/assets/icons/get_started128.png"
    }
  },
  permissions: [
    "tabs",
    "storage",
    "activeTab",
    "contextMenus",
    "notifications",
    "declarativeNetRequest",
    "declarativeNetRequestFeedback"
  ],
  host_permissions: ["https://*/"]
};

// vite.config.ts
var __vite_injected_original_dirname = "/home/arma7x/Desktop/New/kaios/kaios-web-suite/chrome-extension";
var srcDir = resolve(__vite_injected_original_dirname, "src");
var vite_config_default = defineConfig({
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        dashboard: resolve(__vite_injected_original_dirname, "src/dashboard/dashboard.html")
      }
    }
  },
  plugins: [svelte(), nodePolyfills(), crx({ manifest: manifest_default })],
  resolve: {
    alias: {
      src: srcDir,
      buffer: "rollup-plugin-node-polyfills/polyfills/buffer-es6"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9hcm1hN3gvRGVza3RvcC9OZXcva2Fpb3Mva2Fpb3Mtd2ViLXN1aXRlL2Nocm9tZS1leHRlbnNpb25cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2FybWE3eC9EZXNrdG9wL05ldy9rYWlvcy9rYWlvcy13ZWItc3VpdGUvY2hyb21lLWV4dGVuc2lvbi92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9hcm1hN3gvRGVza3RvcC9OZXcva2Fpb3Mva2Fpb3Mtd2ViLXN1aXRlL2Nocm9tZS1leHRlbnNpb24vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBjcnggfSBmcm9tIFwiQGNyeGpzL3ZpdGUtcGx1Z2luXCI7XG5pbXBvcnQgeyBzdmVsdGUgfSBmcm9tIFwiQHN2ZWx0ZWpzL3ZpdGUtcGx1Z2luLXN2ZWx0ZVwiO1xuaW1wb3J0IG5vZGVQb2x5ZmlsbHMgZnJvbSAncm9sbHVwLXBsdWdpbi1ub2RlLXBvbHlmaWxscyc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgbWFuaWZlc3QgZnJvbSBcIi4vbWFuaWZlc3QuanNvblwiO1xuXG5jb25zdCBzcmNEaXIgPSByZXNvbHZlKF9fZGlybmFtZSwgXCJzcmNcIik7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICAgIGJ1aWxkOiB7XG4gICAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICAgICAgZGFzaGJvYXJkOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9kYXNoYm9hcmQvZGFzaGJvYXJkLmh0bWwnKSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgIH0sXG4gICAgcGx1Z2luczogW3N2ZWx0ZSgpLCBub2RlUG9seWZpbGxzKCksIGNyeCh7IG1hbmlmZXN0IH0pXSxcbiAgICByZXNvbHZlOiB7XG4gICAgICAgIGFsaWFzOiB7XG4gICAgICAgICAgICBzcmM6IHNyY0RpcixcbiAgICAgICAgICAgIGJ1ZmZlcjogJ3JvbGx1cC1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMvcG9seWZpbGxzL2J1ZmZlci1lczYnLFxuICAgICAgICB9LFxuICAgIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1csU0FBUyxXQUFXO0FBQ25ZLFNBQVMsY0FBYztBQUN2QixPQUFPLG1CQUFtQjtBQUMxQixTQUFTLGVBQWU7QUFDeEIsU0FBUyxvQkFBb0I7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBSjdCLElBQU0sbUNBQW1DO0FBT3pDLElBQU0sU0FBUyxRQUFRLGtDQUFXLEtBQUs7QUFHdkMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDeEIsT0FBTztBQUFBLElBQ0gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ2IsT0FBTztBQUFBLFFBQ0QsV0FBVyxRQUFRLGtDQUFXLDhCQUE4QjtBQUFBLE1BQ2xFO0FBQUEsSUFDRjtBQUFBLEVBQ0o7QUFBQSxFQUNBLFNBQVMsQ0FBQyxPQUFPLEdBQUcsY0FBYyxHQUFHLElBQUksRUFBRSwyQkFBUyxDQUFDLENBQUM7QUFBQSxFQUN0RCxTQUFTO0FBQUEsSUFDTCxPQUFPO0FBQUEsTUFDSCxLQUFLO0FBQUEsTUFDTCxRQUFRO0FBQUEsSUFDWjtBQUFBLEVBQ0o7QUFDSixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
