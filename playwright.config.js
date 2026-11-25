// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * Playwright E2E configuration
 * - Starts the app via `npm start`
 * - Uses a dedicated sqlite DB via DB_PATH
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm start',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      // Use a separate test DB so tests don't touch dev data
      DB_PATH: process.env.DB_PATH || './db/expenses.test.db',
      NODE_ENV: 'test',
      PORT: process.env.PORT || '3000',
    },
  },
});
