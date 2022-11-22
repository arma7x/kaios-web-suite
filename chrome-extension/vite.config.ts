import { crx } from "@crxjs/vite-plugin";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import nodePolyfills from 'rollup-plugin-node-polyfills';
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
    plugins: [svelte(), nodePolyfills(), crx({ manifest })],
    resolve: {
        alias: {
            src: srcDir,
            buffer: 'rollup-plugin-node-polyfills/polyfills/buffer-es6',
        },
    },
});
