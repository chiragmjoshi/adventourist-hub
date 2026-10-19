import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run admin flows");

test("admin can sign in and reach the dashboard", async ({ page }) => {
  await page.goto("/admin/login");

  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();

  // Dashboard should be reachable within 10s after sign-in.
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: /dashboard|overview/i }).first()).toBeVisible();
});
