import { defineConfig } from 'vitest/config'

export default defineConfig({
  logLevel: 'error', // Suppress warnings like sourcemap issues
  test: {
    globals: true,
    environment: 'node', // Use node for all tests - jsdom causes issues with jose library
    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/lib/**', '**/cjs/**', '**/types/**'],
    setupFiles: ['./vitest.setup.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', '**/*.d.ts', 'node_modules/**'],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './build/coverage',
    },
    server: {
      deps: {
        // Transform these ESM-only packages
        inline: ['mimetext', 'jose'],
      },
    },
    testTimeout: 240000,
    hookTimeout: 240000,
  },
})
