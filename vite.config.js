import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        widget: resolve(__dirname, 'src/widget/chat.js')
      },
      output: {
        entryFileNames: (assetInfo) => {
          return assetInfo.name === 'widget' ? 'chat.js' : '[name]-[hash].js';
        }
      }
    }
  }
});