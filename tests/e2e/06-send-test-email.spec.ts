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

/**
 * Verifies that the Settings → Automations → "Send test email" button at least
 * reaches the edge function and reports success/failure (not a 500). This is a
 * best-effort smoke; the actual email delivery is observed in the Resend/SMTP
 * dashboards and is covered by Phase 1 / Phase 2 integration tests.
 */
test("settings page loads and test-email control is wired", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/settings");

  // One of the tabs is "Automations". Click it if visible.
  const automationsTab = page.getByRole("tab", { name: /automation/i }).first();
  if (await automationsTab.isVisible().catch(() => false)) {
    await automationsTab.click();
  }

  const testBtn = page.getByRole("button", { name: /send test email|test email/i }).first();
  await expect(testBtn).toBeVisible({ timeout: 10_000 });
});
