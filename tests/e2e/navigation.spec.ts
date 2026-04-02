import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("navigates to Collection page", async ({ page }) => {
    await page.getByRole("link", { name: /collection/i }).first().click();
    await expect(page).toHaveURL(/\/collection/);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("navigates to Samples page", async ({ page }) => {
    await page.getByRole("link", { name: /samples/i }).first().click();
    await expect(page).toHaveURL(/\/samples/);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("navigates to Gift Sets page", async ({ page }) => {
    await page.getByRole("link", { name: /gift sets/i }).first().click();
    await expect(page).toHaveURL(/\/gift-sets/);
    await page.waitForLoadState("domcontentloaded");
  });

  test("navigates to Fragrance Quiz page", async ({ page }) => {
    await page.getByRole("link", { name: /find your scent|quiz/i }).first().click();
    await expect(page).toHaveURL(/\/quiz/);
    await page.waitForLoadState("domcontentloaded");
  });

  test("logo click returns to home", async ({ page }) => {
    // Navigate away first
    await page.goto("/collection");
    await page.waitForLoadState("domcontentloaded");
    // Click logo
    await page.locator("a").filter({ hasText: "Shama" }).first().click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("order tracking page loads", async ({ page }) => {
    await page.goto("/track-order");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("wishlist page loads", async ({ page }) => {
    await page.goto("/wishlist");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });
});
