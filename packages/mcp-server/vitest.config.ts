import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@figma-agent/shared/wire': resolve(__dirname, '../shared/src/wire.ts'),
      '@figma-agent/shared/reactions': resolve(__dirname, '../shared/src/reactions.ts'),
      '@figma-agent/shared/mapping': resolve(__dirname, '../shared/src/mapping.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    testTimeout: 10_000,
  },
});
