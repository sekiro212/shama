import { test, expect } from "@playwright/test";

/**
 * The storefront must open in Arabic for every first-time visitor, whatever
 * their browser locale says — most Libyan customers browse on English-language
 * phones. English is reachable, but only by an explicit switch.
 *
 * Runs with storage cleared, overriding the English seed the rest of the suite
 * uses (see playwright.config.ts).
 */
test.use({ storageState: { cookies: [], origins: [] } });

const loaded = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await page.waitForFunction(
    () => (document.querySelector("#root")?.children.length ?? 0) > 0
  );
};

test.describe("Default language", () => {
  test("a first-time visitor gets Arabic and RTL", async ({ page }) => {
    await loaded(page);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    // scoped + exact: the hero CTA «تسوّق المجموعة» also contains this word
    await expect(
      page.getByRole("navigation", { name: "Primary" })
        .getByRole("link", { name: "المجموعة", exact: true })
    ).toBeVisible();
  });

  test("an English browser locale does not override Arabic", async ({ browser }) => {
    const ctx = await browser.newContext({ locale: "en-US" });
    const page = await ctx.newPage();
    await page.goto("http://localhost:5179/");
    await page.waitForFunction(
      () => (document.querySelector("#root")?.children.length ?? 0) > 0
    );
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await ctx.close();
  });

  test("no language is stored until the visitor picks one", async ({ page }) => {
    await loaded(page);
    expect(
      await page.evaluate(() => localStorage.getItem("shama-lang-choice"))
    ).toBeNull();

    await page.locator('header button[aria-label="اللغة"]').first().click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    expect(
      await page.evaluate(() => localStorage.getItem("shama-lang-choice"))
    ).toBe("en");
  });

  test("an explicit English choice survives a reload", async ({ page }) => {
    await loaded(page);
    await page.locator('header button[aria-label="اللغة"]').first().click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.reload();
    await page.waitForFunction(
      () => (document.querySelector("#root")?.children.length ?? 0) > 0
    );
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("a legacy auto-written preference is ignored", async ({ page, context }) => {
    // The old code wrote shama-language on every page load, so visitors who
    // never chose English still have "en" saved. That value is not a choice.
    await context.addInitScript(() =>
      localStorage.setItem("shama-language", "en")
    );
    await loaded(page);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});
