import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(import.meta.dirname, '../shared'),
      '@packaging': path.resolve(import.meta.dirname, '../packaging'),
      '@release': path.resolve(import.meta.dirname, '../release'),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, '../dist-website'),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false,
  },
});
