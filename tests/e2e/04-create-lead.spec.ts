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

test("admin can create a new lead", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/leads");

  await page.getByRole("button", { name: /add lead|new lead|create lead/i }).first().click();

  const stamp = Date.now();
  await page.getByLabel(/name/i).first().fill(`Playwright Lead ${stamp}`);
  await page.getByLabel(/mobile|phone/i).first().fill("9123456789");

  await page.getByRole("button", { name: /save|create|submit/i }).first().click();

  await expect(page.getByText(`Playwright Lead ${stamp}`)).toBeVisible({ timeout: 10_000 });
});
