import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/browser',
  use: {
    baseURL: 'http://127.0.0.1:4173',
  },
  webServer: {
    command: 'vite --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], deviceScaleFactor: 2 },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], deviceScaleFactor: 2 },
    },
  ],
})
