import { defineConfig, devices } from '@playwright/test';

// FRONTEND_URL/API_URL default to this student's local dev setup (Vite on
// :3000, Express on :5000). Overriding them via env vars is what lets the
// exact same test suite run unchanged against Docker Compose or the AWS EC2
// deployment later in the CI/CD pipeline (Jenkins stage "Run Playwright
// Tests"), instead of hardcoding localhost everywhere.
const FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
