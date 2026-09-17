import { test, expect } from "@playwright/test";

const USERNAME = process.env.ADMIN_TEST_USERNAME;
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;

// لوحة الإدارة تُختار في src/main.tsx بناءً على اسم المضيف (hostname) وليس
// المسار — على المضيف العادي (baseURL الافتراضي localhost) يُركَّب تطبيق
// المتجر App.tsx فقط، وهو لا يملك مسار /admin/* (فقط /admin كإعادة توجيه)،
// فلا تظهر شاشة الدخول ولا صفحة المشاهير إطلاقًا هناك. تطبيق الإدارة
// (AdminApp.tsx) يُخدَّم بدلًا من ذلك عبر admin.localhost (نفس ما يعيد إليه
// src/pages/AdminRedirect.tsx في وضع التطوير)، وكروميوم يحلّ تلقائيًا أي
// *.localhost إلى loopback فيخدمه نفس خادم Vite. مساراته جذرية (بلا بادئة
// /admin) — صفحة المشاهير هي /influencers وليست /admin/influencers.
// المنفذ 5179 مثبّت يدويًا ليطابق baseURL في playwright.config.ts — حدِّثه
// هناك أولًا إذا تغيّر هذا المنفذ.
const ADMIN_BASE = "http://admin.localhost:5179";
const INFLUENCERS_URL = `${ADMIN_BASE}/influencers`;

// تُتخطّى المجموعة كاملة بلا بيانات دخول، حتى لا تمر بصمت دون تشغيل فعلي.
test.describe("admin influencers", () => {
  test.skip(
    !USERNAME || !PASSWORD,
    "set ADMIN_TEST_USERNAME and ADMIN_TEST_PASSWORD to run admin e2e tests"
  );

  test.beforeEach(async ({ page }) => {
    // بوابة الدخول الفعلية هي AdminLoginGate داخل src/pages/admin/AdminLayout.tsx.
    // (LoginDialog.tsx في dialogs/ مكوّن يتيم لا يستورده أحد — لا تُستخدم محدّداته.)
    // AdminLayout يعرض هذه البوابة بدلًا من <Outlet /> طالما لم تتم المصادقة، بصرف
    // النظر عن المسار الفرعي المطلوب، لذا التوجّه مباشرةً إلى صفحة المشاهير آمن.
    await page.goto(INFLUENCERS_URL);

    // الحقول محدَّدة بمعرّفات ثابتة (admin-shell-username/password) بدل الاعتماد
    // على نص التسمية المترجَم.
    await page.locator("#admin-shell-username").fill(USERNAME!);
    await page.locator("#admin-shell-password").fill(PASSWORD!);
    await page
      .getByRole("button", { name: /sign in|تسجيل الدخول/i })
      .click();

    // التحقق من نجاح الدخول عبر عنصر لا يظهر إلا بعد المصادقة (عنوان صفحة
    // المشاهير)، لا عبر الرابط — فحالة المصادقة تُعاد رسمها على نفس الـ URL.
    await expect(
      page.getByRole("heading", { name: /influencers|المشاهير/i })
    ).toBeVisible();
  });

  test("influencers page loads with its summary table", async ({ page }) => {
    await page.goto(INFLUENCERS_URL);
    // إمّا الجدول أو حالة الفراغ — كلاهما تحميل ناجح.
    await expect(
      page.getByRole("heading", { name: /influencers|المشاهير/i })
    ).toBeVisible();
  });

  test("creating an influencer adds a row", async ({ page }) => {
    await page.goto(INFLUENCERS_URL);
    const name = `E2E Influencer ${Date.now()}`;

    // عند فراغ الجدول يُعرض زرّ بالنص نفسه مرّتين (رأس الصفحة + EmptyState)،
    // فنحدّد الأول تحديدًا — وهو ثابت الوجود بصرف النظر عن حالة الجدول.
    await page
      .getByRole("button", { name: /add influencer|إضافة مشهور/i })
      .first()
      .click();
    // The Name field's <Label> has no htmlFor/id pairing with the <Input>
    // in InfluencerFormDialog.tsx, so getByLabel can't resolve it — match
    // on the namePlaceholder translation instead (both languages).
    await page.getByPlaceholder(/Sara Ahmed|سارة أحمد/i).fill(name);
    // زر الإرسال داخل النافذة يحمل النص نفسه (كلاهما "create") — يُحدَّد ضمن
    // نطاق الـ dialog لتفادي الالتباس مع زرّ الرأس/EmptyState خارجه.
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /add influencer|إضافة مشهور/i })
      .click();

    await expect(page.getByText(name)).toBeVisible();
  });

  test("statement dialog opens with zeroed totals for a fresh influencer", async ({
    page,
  }) => {
    await page.goto(INFLUENCERS_URL);
    await page
      .getByRole("button", { name: /statement|قائمة الحساب/i })
      .first()
      .click();
    await expect(
      page.getByRole("dialog").getByText(/per-code breakdown|تفصيل الأكواد/i)
    ).toBeVisible();
  });
});
