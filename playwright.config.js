const { defineConfig, devices } = require('@playwright/test');

const PORT = 3100; // separate from the dev server (3000)

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // single SQLite file: run serially
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'api', testMatch: /.*\.api\.spec\.js/ },
    { name: 'ui-chromium', testMatch: /.*\.ui\.spec\.js/, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npx cross-env NODE_ENV=test DB_PATH=./data/test.db PORT=${PORT} node src/server.js`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
