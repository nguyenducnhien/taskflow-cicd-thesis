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
  // Locally, Chromium is the only heavy thing competing for CPU/RAM, so the
  // default (half the CPU cores) is fine. In the Jenkins container, the same
  // machine is ALSO running the Jenkins JVM plus the mysql/backend/frontend
  // containers this suite is testing against — capping workers leaves them
  // more headroom instead of maximizing Playwright's own parallelism.
  workers: process.env.CI ? 4 : undefined,
  // 'junit' feeds Jenkins' `junit` pipeline step (pass/fail trend graph);
  // 'html' feeds the `publishHTML` step (full report with traces/screenshots).
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
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
