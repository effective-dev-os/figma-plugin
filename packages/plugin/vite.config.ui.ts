import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'src'),
  publicDir: false,
  plugins: [react(), viteSingleFile()],
  build: {
    target: 'es2020',
    rollupOptions: {
      input: resolve(__dirname, 'src/ui.html'),
      output: {
        entryFileNames: 'ui.js',
        inlineDynamicImports: true,
      },
    },
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: false,
    sourcemap: false,
  },
  resolve: {
    alias: {
      '@figma-agent/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});
