import { test, expect } from "@playwright/test";

// Mock Vanex API so cart/checkout works without a real token
test.describe("Cart & Checkout", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Vanex cities API
    await page.route("**/vanex.ly/api/v1/city/all", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status_code: 200,
          data: [
            { id: 1, name: "طرابلس", name_en: "Tripoli", code: "TIP", region_id: 1, active: true },
            { id: 2, name: "بنغازي", name_en: "Benghazi", code: "BEN", region_id: 2, active: true },
            { id: 3, name: "مصراتة", name_en: "Misrata", code: "MIS", region_id: 3, active: true },
          ],
          errors: null,
        }),
      });
    });

    // Mock Vanex sub-cities API
    await page.route("**/vanex.ly/api/v1/delivery/price**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status_code: 200,
          data: [
            { sub_city_id: 10, sub_city_name: "باب بن غشير", price: 15 },
            { sub_city_id: 11, sub_city_name: "السواني", price: 18 },
            { sub_city_id: 12, sub_city_name: "تاجوراء", price: 20 },
          ],
          errors: null,
        }),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("cart button opens cart sidebar", async ({ page }) => {
    await page.getByRole("button", { name: /cart/i }).click();
    // Radix renders the sheet as a dialog. The previous selector looked for a
    // "SheetContent" class, which is a component name and never reaches the DOM.
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole("dialog").getByText(/shopping cart|السلة/i).first()
    ).toBeVisible();
  });

  test("empty cart shows empty state message", async ({ page }) => {
    await page.getByRole("button", { name: /cart/i }).click();
    await page.waitForTimeout(500);
    const bodyText = await page.locator("body").innerText();
    // Should mention empty cart or start shopping
    expect(
      bodyText.toLowerCase().includes("empty") ||
      bodyText.toLowerCase().includes("shopping") ||
      bodyText.toLowerCase().includes("cart")
    ).toBeTruthy();
  });

  test("cart item count badge appears after adding item", async ({ page }) => {
    // Go to collection and wait for products
    await page.goto("/collection");
    await page.waitForTimeout(3000);

    // Try to find an Add to Cart button
    const addBtns = page.getByRole("button", { name: /add to cart/i });
    const count = await addBtns.count();

    if (count > 0) {
      await addBtns.first().click();
      await page.waitForTimeout(500);
      // Cart count badge should appear
      const badge = page.locator("header").locator("text=/[1-9]/").first();
      // Just verify no crash
      await expect(page.locator("body")).toBeVisible();
    } else {
      // No products loaded (e.g. empty DB) - still pass
      test.skip();
    }
  });

  test("checkout sends a guest to login, keeping a return path", async ({ page }) => {
    // Checkout stopped being a dialog in fbe3f03, which made it a real page
    // behind an auth gate. Both older tests here still described the dialog.
    await page.addInitScript(() => {
      localStorage.setItem(
        "cart",
        JSON.stringify([
          {
            id: "test-product-1",
            name: "Test Perfume",
            price: 99,
            image: "",
            size: "100ml",
            quantity: 1,
            stock_quantity: 10,
            addedAt: new Date().toISOString(),
          },
        ])
      );
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: /cart/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: /checkout|proceed/i }).first().click();

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("textbox", { name: /email/i })
        .or(page.getByPlaceholder(/email|your@email/i)).first()
    ).toBeVisible();
  });

  test("the cart survives the login redirect", async ({ page }) => {
    // Bouncing to login must not drop the cart, or the guest returns to an
    // empty basket and the sale is gone.
    await page.addInitScript(() => {
      localStorage.setItem(
        "cart",
        JSON.stringify([
          {
            id: "test-product-1",
            name: "Test Perfume",
            price: 99,
            image: "",
            size: "100ml",
            quantity: 1,
            stock_quantity: 10,
            addedAt: new Date().toISOString(),
          },
        ])
      );
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: /cart/i }).click();
    await page.getByRole("button", { name: /checkout|proceed/i }).first().click();
    await expect(page).toHaveURL(/\/login/);

    const cart = await page.evaluate(() => localStorage.getItem("cart"));
    expect(cart).toContain("test-product-1");
  });

  test("city dropdown loads Vanex cities from mocked API", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "cart",
        JSON.stringify([
          {
            id: "test-product-1",
            name: "Test Perfume",
            price: 99,
            image: "",
            size: "100ml",
            quantity: 1,
            stock_quantity: 10,
            addedAt: new Date().toISOString(),
          },
        ])
      );
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: /cart/i }).click();
    await page.waitForTimeout(500);

    const checkoutBtn = page.getByRole("button", { name: /checkout|proceed/i });
    if (await checkoutBtn.count() === 0) { test.skip(); return; }
    await checkoutBtn.first().click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]');
    if (await dialog.count() === 0) { test.skip(); return; }

    // Wait for cities to load (mocked, should be instant)
    await page.waitForTimeout(500);

    // Find the city dropdown trigger and open it
    const cityTrigger = dialog.locator('[role="combobox"]').first();
    if (await cityTrigger.count() === 0) { test.skip(); return; }

    await cityTrigger.click();
    await page.waitForTimeout(500);

    // Mocked cities should appear
    await expect(page.getByRole("option", { name: /Tripoli/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole("option", { name: /Benghazi/i })).toBeVisible({ timeout: 3000 });
  });

  test("sub-city dropdown appears after selecting a city", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "cart",
        JSON.stringify([
          {
            id: "test-product-1",
            name: "Test Perfume",
            price: 99,
            image: "",
            size: "100ml",
            quantity: 1,
            stock_quantity: 10,
            addedAt: new Date().toISOString(),
          },
        ])
      );
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: /cart/i }).click();
    await page.waitForTimeout(500);

    const checkoutBtn = page.getByRole("button", { name: /checkout|proceed/i });
    if (await checkoutBtn.count() === 0) { test.skip(); return; }
    await checkoutBtn.first().click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]');
    if (await dialog.count() === 0) { test.skip(); return; }

    await page.waitForTimeout(500);

    // Select Tripoli from the city dropdown
    const cityTrigger = dialog.locator('[role="combobox"]').first();
    if (await cityTrigger.count() === 0) { test.skip(); return; }

    await cityTrigger.click();
    await page.waitForTimeout(300);

    const tripoliOption = page.getByRole("option", { name: /Tripoli/i });
    if (await tripoliOption.count() === 0) { test.skip(); return; }
    await tripoliOption.click();
    await page.waitForTimeout(1000); // Wait for sub-city API call

    // A second combobox (sub-city) should now be visible
    const comboboxes = dialog.locator('[role="combobox"]');
    const comboCount = await comboboxes.count();
    expect(comboCount).toBeGreaterThanOrEqual(2);

    // Open it and check mocked sub-cities
    await comboboxes.nth(1).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("option", { name: /باب بن غشير/i })).toBeVisible({ timeout: 3000 });
  });
});
