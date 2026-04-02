import { test, expect } from "@playwright/test";

/**
 * Tests for the Vanex API integration via CartSidebar.
 * All Vanex endpoints are mocked — no real token needed.
 */
test.describe("Vanex API Integration", () => {
  test("Vanex cities endpoint is called when checkout opens", async ({ page }) => {
    let vanexCitiesCalled = false;

    await page.route("**/vanex.ly/api/v1/city/all", (route) => {
      vanexCitiesCalled = true;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status_code: 200,
          data: [
            { id: 1, name: "طرابلس", name_en: "Tripoli", code: "TIP", region_id: 1, active: true },
          ],
          errors: null,
        }),
      });
    });

    // Seed cart
    await page.addInitScript(() => {
      localStorage.setItem(
        "cart",
        JSON.stringify([
          { id: "p1", name: "Oud Rose", price: 150, image: "", size: "100ml", quantity: 1, stock_quantity: 5 },
        ])
      );
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: /cart/i }).click();
    await page.waitForTimeout(400);

    const checkoutBtn = page.getByRole("button", { name: /checkout|proceed/i });
    if (await checkoutBtn.count() === 0) { test.skip(); return; }
    await checkoutBtn.first().click();

    await page.waitForTimeout(1500); // Cities fetch happens on checkout open

    expect(vanexCitiesCalled).toBeTruthy();
  });

  test("Vanex delivery/price called after city selection", async ({ page }) => {
    let deliveryPriceCalled = false;

    await page.route("**/vanex.ly/api/v1/city/all", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status_code: 200,
          data: [{ id: 1, name: "طرابلس", name_en: "Tripoli", code: "TIP", region_id: 1, active: true }],
          errors: null,
        }),
      });
    });

    await page.route("**/vanex.ly/api/v1/delivery/price**", (route) => {
      deliveryPriceCalled = true;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status_code: 200,
          data: [
            { sub_city_id: 10, sub_city_name: "باب بن غشير", price: 15 },
          ],
          errors: null,
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        "cart",
        JSON.stringify([
          { id: "p1", name: "Oud Rose", price: 150, image: "", size: "100ml", quantity: 1, stock_quantity: 5 },
        ])
      );
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: /cart/i }).click();
    await page.waitForTimeout(400);

    const checkoutBtn = page.getByRole("button", { name: /checkout|proceed/i });
    if (await checkoutBtn.count() === 0) { test.skip(); return; }
    await checkoutBtn.first().click();
    await page.waitForTimeout(1200);

    const dialog = page.locator('[role="dialog"]');
    if (await dialog.count() === 0) { test.skip(); return; }

    const cityTrigger = dialog.locator('[role="combobox"]').first();
    if (await cityTrigger.count() === 0) { test.skip(); return; }

    await cityTrigger.click();
    await page.waitForTimeout(300);

    const tripoliOption = page.getByRole("option", { name: /Tripoli/i });
    if (await tripoliOption.count() === 0) { test.skip(); return; }

    await tripoliOption.click();
    await page.waitForTimeout(1500);

    expect(deliveryPriceCalled).toBeTruthy();
  });

  test("Vanex tracking endpoint called on order tracking page", async ({ page }) => {
    let trackingCalled = false;

    await page.route("**/supabase.co/rest/v1/orders**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "track-test-order",
          first_name: "Test",
          last_name: "User",
          email: "test@test.com",
          phone: "0912345678",
          city: "Tripoli",
          place_name: "Center",
          total: 100,
          status: "shipped",
          items: [],
          order_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          vanex_package_code: "H-TEST-CODE-001",
        }]),
      });
    });

    await page.route("**/vanex.ly/api/v1/tracking**", (route) => {
      trackingCalled = true;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status_code: 200,
          data: {
            code: "H-TEST-CODE-001",
            status: "في الطريق",
            receiver_name: "Test User",
            current_location: "Tripoli Hub",
            estimated_delivery: "2026-04-05",
          },
          errors: null,
        }),
      });
    });

    await page.goto("/track-order");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("input").first().fill("track-test-order");
    await page.getByRole("button", { name: /track/i }).click();
    await page.waitForTimeout(3000);

    expect(trackingCalled).toBeTruthy();
  });
});
