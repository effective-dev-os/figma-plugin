import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    target: 'es2017',
    lib: {
      entry: resolve(__dirname, 'src/code.ts'),
      name: 'code',
      fileName: 'code',
      formats: ['iife'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: 'code.js',
        inlineDynamicImports: true,
      },
      external: [],
    },
    minify: false,
    sourcemap: false,
  },
  resolve: {
    alias: {
      '@figma-agent/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});
