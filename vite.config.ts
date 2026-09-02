import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/roulette/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 1235,
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
