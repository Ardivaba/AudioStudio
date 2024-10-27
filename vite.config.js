import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import eslintPlugin from "vite-plugin-eslint"

export default defineConfig({
    server: {
      host: '0.0.0.0',
      port: 5173
    },
    plugins: [
        eslintPlugin(),
        vue(),
    ],
    assetsInclude: ['**/*.md', '**/*.mp4', '**/*.webm', '**/*.ogg'],
    root: './web'
})