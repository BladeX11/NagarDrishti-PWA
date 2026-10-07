import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'client/**/*'],
    alias: {
      '@shared': path.resolve(import.meta.dirname, 'shared'),
    },
  },
});
