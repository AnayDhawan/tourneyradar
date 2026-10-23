import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, '.') },
  },
  test: {
    environment: 'node',
    // Playwright specs live in tests/e2e and run with `npm run test:e2e`.
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
  },
});
