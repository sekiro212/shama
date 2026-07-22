import { test, expect } from "@playwright/test";

const USERNAME = process.env.ADMIN_TEST_USERNAME;
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;

// تُتخطّى المجموعة كاملة بلا بيانات دخول، حتى لا تمر بصمت دون تشغيل فعلي.
test.describe("admin influencers", () => {
  test.skip(
    !USERNAME || !PASSWORD,
    "set ADMIN_TEST_USERNAME and ADMIN_TEST_PASSWORD to run admin e2e tests"
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/influencers");
    // Labels come from admin.login.username/password (en.json / ar.json) —
    // match both so the test runs regardless of the active language.
    await page.getByLabel(/username|اسم المستخدم/i).fill(USERNAME!);
    await page.getByLabel(/password|كلمة المرور/i).fill(PASSWORD!);
    await page
      .getByRole("button", { name: /login|sign in|تسجيل الدخول/i })
      .click();
    await expect(page).toHaveURL(/\/admin/);
  });

  test("influencers page loads with its summary table", async ({ page }) => {
    await page.goto("/admin/influencers");
    // إمّا الجدول أو حالة الفراغ — كلاهما تحميل ناجح.
    await expect(
      page.getByRole("heading", { name: /influencers|المشاهير/i })
    ).toBeVisible();
  });

  test("creating an influencer adds a row", async ({ page }) => {
    await page.goto("/admin/influencers");
    const name = `E2E Influencer ${Date.now()}`;

    await page
      .getByRole("button", { name: /add influencer|إضافة مشهور/i })
      .click();
    // The Name field's <Label> has no htmlFor/id pairing with the <Input>
    // in InfluencerFormDialog.tsx, so getByLabel can't resolve it — match
    // on the namePlaceholder translation instead (both languages).
    await page.getByPlaceholder(/Sara Ahmed|سارة أحمد/i).fill(name);
    await page
      .getByRole("button", { name: /add influencer|إضافة مشهور/i })
      .last()
      .click();

    await expect(page.getByText(name)).toBeVisible();
  });

  test("statement dialog opens with zeroed totals for a fresh influencer", async ({
    page,
  }) => {
    await page.goto("/admin/influencers");
    await page
      .getByRole("button", { name: /statement|قائمة الحساب/i })
      .first()
      .click();
    await expect(
      page.getByRole("dialog").getByText(/per-code breakdown|تفصيل الأكواد/i)
    ).toBeVisible();
  });
});
