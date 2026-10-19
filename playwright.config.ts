import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright smoke suite.
 *
 * The baseURL defaults to the local dev server. For staging runs point
 * PLAYWRIGHT_BASE_URL at the staging deploy URL and supply the admin
 * credentials via E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD env vars.
 *
 * In CI we only run these after a staging deploy succeeds (not on every PR —
 * the dev server depends on Supabase and would be flaky on push).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
