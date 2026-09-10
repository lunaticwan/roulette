import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/roulette/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('box2d-wasm')) {
              return 'vendor-box2d';
            }
            if (id.includes('howler') || id.includes('canvas-confetti')) {
              return 'vendor-media';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 1235,
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
