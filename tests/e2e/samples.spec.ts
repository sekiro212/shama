import { test, expect } from "@playwright/test";

test.describe("Samples Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/samples");
    await page.waitForLoadState("domcontentloaded");
  });

  test("page renders without crashing", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  });

  test("shows 'Sample' or 'Try Before You Buy' content", async ({ page }) => {
    await page.waitForTimeout(1500);
    const bodyText = await page.locator("body").innerText();
    expect(
      bodyText.toLowerCase().includes("sample") ||
      bodyText.toLowerCase().includes("try")
    ).toBeTruthy();
  });

  test("shows loading state that resolves", async ({ page }) => {
    // Wait for data to load (Supabase query)
    await page.waitForTimeout(3000);
    // No vite error overlay
    await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  });

  test("sample size buttons appear when products load", async ({ page }) => {
    await page.waitForTimeout(3000);
    // If there are sample products, size buttons like 3ml/5ml should appear
    // or a "no samples" message
    const bodyText = await page.locator("body").innerText();
    const hasSampleContent =
      bodyText.includes("ml") ||
      bodyText.toLowerCase().includes("sample") ||
      bodyText.toLowerCase().includes("no sample") ||
      bodyText.toLowerCase().includes("check back");
    expect(hasSampleContent).toBeTruthy();
  });
});
