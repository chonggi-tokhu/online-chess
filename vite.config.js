import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
/*import vueDevTools from 'vite-plugin-vue-devtools'; */

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        //vueDevTools(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./frontend/served/dist', import.meta.url))
        },
    },
    build: {
        outDir: 'served/dist',
    }
})
