import { expect, test } from "@playwright/test";

/**
 * Submits an enquiry on the public contact page.
 * The lead-submit edge function has rate limits + a honeypot; this test uses
 * clearly-fake data and expects the UI to acknowledge success without actually
 * creating a usable prod lead (sales will see "Playwright smoke" and ignore).
 */
test("public enquiry form submits successfully", async ({ page }) => {
  await page.goto("/contact");

  const name = page.getByLabel(/name/i).first();
  const mobile = page.getByLabel(/mobile|phone/i).first();
  const message = page.getByLabel(/message|requirement|details/i).first();

  await name.fill("Playwright Smoke");
  await mobile.fill("9876543210");
  if (await message.isVisible().catch(() => false)) {
    await message.fill("Automated smoke test — ignore. Please do not call.");
  }

  await page.getByRole("button", { name: /submit|send|enquiry|book/i }).first().click();

  // Thank-you state should render within 10s.
  await expect(
    page.getByText(/thank you|received|we will|get back|soon/i).first()
  ).toBeVisible({ timeout: 10_000 });
});
