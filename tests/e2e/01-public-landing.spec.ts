import { expect, test } from "@playwright/test";

test.describe("public homepage", () => {
  test("renders the hero and primary CTAs", async ({ page }) => {
    await page.goto("/");

    // Page is up (status is 200 — Playwright throws on 4xx/5xx by default).
    await expect(page).toHaveTitle(/.+/);

    // The hero should have a "Plan a trip" / enquiry CTA somewhere.
    const anyCta = page.getByRole("link", { name: /plan|enquiry|contact|whatsapp|book/i }).first();
    await expect(anyCta).toBeVisible();

    // Nav should expose Destinations and Trips (public).
    await expect(page.getByRole("link", { name: /destinations/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /trips|packages|itiner/i }).first()).toBeVisible();
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors, `console errors: ${errors.join("\n")}`).toHaveLength(0);
  });
});
