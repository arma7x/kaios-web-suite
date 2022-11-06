import { crx } from "@crxjs/vite-plugin";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import { defineConfig } from "vite";
import manifest from "./manifest.json";

const srcDir = resolve(__dirname, "src");

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        sourcemap: true,
        rollupOptions: {
          input: {
                dashboard: resolve(__dirname, 'src/dashboard/dashboard.html'),
          },
        },
    },
    plugins: [svelte(), crx({ manifest })],
    resolve: {
        alias: {
            src: srcDir,
        },
    },
});
