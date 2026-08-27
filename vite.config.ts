import { defineConfig } from 'vite';

export default defineConfig({
  base: '/roulette/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 1235,
  },
});
