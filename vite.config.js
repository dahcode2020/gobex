import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    open: '/index.html',
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        boutique: 'boutique.html',
      },
    },
  },
});
