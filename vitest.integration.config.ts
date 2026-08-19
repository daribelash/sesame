import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts: integration tests need Docker (Testcontainers)
// and a node environment, and shouldn't run as part of the fast unit/component
// suite that runs on every save. Convention: server/**/*.integration.test.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.integration.test.ts'],
  },
})
