import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
      '@launcher': path.resolve(__dirname, 'launcher/src'),
    },
  },
});
