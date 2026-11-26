import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // First run may download a MongoDB binary for mongodb-memory-server.
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
