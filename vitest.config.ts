import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Standalone vitest config — the test script passes --config so vitest
// does NOT auto-merge vite.config.ts (which has @cloudflare/vite-plugin,
// incompatible with vitest's resolve.external settings).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
