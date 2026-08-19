import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    // The real server, not `vite preview`: auth needs real API routes and a
    // real DB (DATABASE_URL from scripts/run-e2e.sh), and the service
    // worker that makes offline work only exists once built.
    command: 'npm run build && npm start',
    url: 'http://localhost:4173',
    env: { PORT: '4173' },
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
