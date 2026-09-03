import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/health': { target: 'http://127.0.0.1:8001', changeOrigin: true },
        '/system': { target: 'http://127.0.0.1:8001', changeOrigin: true },
        '/candidate': { target: 'http://127.0.0.1:8001', changeOrigin: true },
        '/videos': { target: 'http://127.0.0.1:8001', changeOrigin: true },
        '/search': { target: 'http://127.0.0.1:8001', changeOrigin: true },
        '/clips': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      },
    },
  };
});
