import { test, expect } from "@playwright/test";

test.describe("Order Tracking Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/track-order");
    await page.waitForLoadState("domcontentloaded");
  });

  test("page loads with search form", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("vite-error-overlay")).toHaveCount(0);
    // Search input should be present
    const input = page.locator("input").first();
    await expect(input).toBeVisible();
  });

  test("shows title about tracking", async ({ page }) => {
    const bodyText = await page.locator("body").innerText();
    expect(
      bodyText.toLowerCase().includes("track") ||
      bodyText.toLowerCase().includes("order")
    ).toBeTruthy();
  });

  test("submitting empty search does nothing", async ({ page }) => {
    const trackBtn = page.getByRole("button", { name: /track/i });
    // Button should be disabled when input is empty
    await expect(trackBtn).toBeDisabled();
  });

  test("searching with invalid order ID shows error", async ({ page }) => {
    const input = page.locator("input").first();
    await input.fill("invalid-order-id-xyz-000");

    const trackBtn = page.getByRole("button", { name: /track/i });
    await trackBtn.click();

    // Wait for response
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").innerText();
    // Should show an error or "not found" message
    expect(
      bodyText.toLowerCase().includes("not found") ||
      bodyText.toLowerCase().includes("no order") ||
      bodyText.toLowerCase().includes("wrong") ||
      bodyText.toLowerCase().includes("error") ||
      bodyText.toLowerCase().includes("couldn") ||
      bodyText.toLowerCase().includes("طلب")
    ).toBeTruthy();
  });

  test("Vanex tracking section shows when order has package code", async ({ page }) => {
    // Mock Supabase to return an order with a vanex_package_code
    await page.route("**/supabase.co/rest/v1/orders**", (route) => {
      const url = route.request().url();
      if (url.includes("id=eq.test-order-123")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "test-order-123",
              first_name: "Ahmed",
              last_name: "Mohamed",
              email: "ahmed@test.com",
              phone: "0912345678",
              city: "Tripoli / طرابلس",
              place_name: "باب بن غشير",
              total: 250,
              status: "shipped",
              items: [
                {
                  id: "p1",
                  name: "Rose Oud",
                  price: 250,
                  size: "100ml",
                  quantity: 1,
                  image: "",
                },
              ],
              order_date: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              vanex_package_code: "H-13903-TIP-5885703",
            },
          ]),
        });
        return;
      }
      route.continue();
    });

    // Mock Vanex tracking
    await page.route("**/vanex.ly/api/v1/tracking**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status_code: 200,
          data: {
            code: "H-13903-TIP-5885703",
            status: "في الطريق",
            receiver_name: "Ahmed Mohamed",
            current_location: "طرابلس - مركز التوزيع",
            estimated_delivery: "2026-04-05",
          },
          errors: null,
        }),
      });
    });

    await page.goto("/track-order");
    await page.waitForLoadState("domcontentloaded");

    const input = page.locator("input").first();
    await input.fill("test-order-123");
    await page.getByRole("button", { name: /track/i }).click();

    // Wait for Supabase + Vanex tracking
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").innerText();

    // Should show Vanex tracking section
    expect(
      bodyText.includes("Vanex") ||
      bodyText.includes("H-13903-TIP-5885703") ||
      bodyText.includes("في الطريق") ||
      bodyText.includes("طرابلس")
    ).toBeTruthy();
  });
});
