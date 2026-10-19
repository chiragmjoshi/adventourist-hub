import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run admin flows");

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 10_000 });
}

test("admin can open the new trip cashflow wizard", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/trip-cashflow/new");

  // The wizard should mount — Step 1 "Client / Trip" has a client-name input.
  await expect(page.getByText(/client|trip|client name/i).first()).toBeVisible({ timeout: 10_000 });

  // Smoke only: this spec does NOT save a row, to avoid polluting prod data.
  // A richer version lives in the staging-only e2e tier (see ROLLOUT_PLAN.md).
});
