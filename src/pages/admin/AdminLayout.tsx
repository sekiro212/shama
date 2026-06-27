// ===========================================================================
// AdminLayout.tsx — التخطيط/الغلاف (LAYOUT) لتطبيق لوحة الإدارة.
// يعمل كبوابة مصادقة وكإطار بصري في آنٍ واحد: إذا لم يسجّل المسؤول الدخول يعرض
// نموذج تسجيل الدخول؛ وبعد المصادقة يعرض الشريط الجانبي + الشريط العلوي و
// <Outlet /> حيث تظهر صفحات الموارد المدفوعة بالمسارات.
// ===========================================================================

import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import AdminSidebar, { MobileAdminSidebar } from "./components/AdminSidebar";
import { AdminTopBar } from "./components/AdminTopBar";
import { useAdminBadges } from "./hooks/useAdminBadges";
import { AdminEventProvider } from "./contexts/AdminEventContext";

// ---------------------------------------------------------------------------
// بوابة تسجيل الدخول -- تظهر عندما لا يكون المسؤول مُصادَقًا
// ---------------------------------------------------------------------------

/**
 * AdminLoginGate — نموذج اسم المستخدم/كلمة المرور بملء الشاشة يُعرض للمسؤولين
 * غير المُصادَقين. يرسل بيانات الاعتماد عبر `login()` من AdminAuthContext (الذي
 * يتحقق منها مقابل جدول `users` في Supabase) ويُظهر النجاح/الخطأ عبر إشعارات
 * toast. يعرضه AdminLayout كلما كانت `isAuthenticated` بقيمة false.
 */
function AdminLoginGate() {
  const { t } = useLanguage();
  const { login } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // التحقق من المدخلات، استدعاء تسجيل دخول المسؤول، ثم إظهار النتيجة كإشعار toast.
  const handleSubmit = async () => {
    if (!username || !password) return;
    setLoading(true);
    const result = await login({ username, password });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error || t("admin.shell.loginError"));
    } else {
      toast.success(t("admin.login.loginSuccess"));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] flex items-center justify-center p-4">
      <div className="glass-card p-8 rounded-2xl w-full max-w-md bg-white/60 dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
            S
          </div>
          <h1 className="text-2xl font-bold gradient-text">
            {/* استخدام العنوان المترجَم، مع الرجوع إلى "Admin Login" عند غياب
                المفتاح (تُعيد t() المفتاح نفسه إن لم يكن مترجَمًا). */}
            {(() => {
              const v = t("admin.shell.loginTitle");
              return v !== "admin.shell.loginTitle" ? v : "Admin Login";
            })()}
          </h1>
          <p className="text-sm text-[#6B7B8D] mt-1">
            Shama Perfumes Administration
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="admin-shell-username"
              className="text-[#323D50] dark:text-white/80"
            >
              {t("admin.shell.usernameLabel")}
            </Label>
            <Input
              id="admin-shell-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
              placeholder={t("admin.login.enterUsername")}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="admin-shell-password"
              className="text-[#323D50] dark:text-white/80"
            >
              {t("admin.shell.passwordLabel")}
            </Label>
            <Input
              id="admin-shell-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
              placeholder={t("admin.login.enterPassword")}
              disabled={loading}
            />
          </div>

          <LoadingButton
            onClick={handleSubmit}
            loading={loading}
            loadingText={t("admin.login.loggingIn")}
            disabled={!username || !password}
            className="w-full bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
          >
            {t("admin.shell.loginButton")}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// غلاف الإدارة بعد المصادقة
// ---------------------------------------------------------------------------

/**
 * AuthenticatedShell — واجهة الإدارة الفعلية التي تظهر بعد تسجيل الدخول.
 * يعرض الأشرطة الجانبية لسطح المكتب + الجوال، والشريط العلوي، و<Outlet /> لصفحات
 * المسارات. تُعكَس حالة طيّ الشريط الجانبي من localStorage بحيث تستطيع منطقة
 * المحتوى الرئيسية ضبط حشوها (padding) الجانبي ليطابق عرض الشريط الجانبي.
 */
function AuthenticatedShell() {
  // أعداد شارات الإشعارات (المراجعات/الذكريات المعلّقة) للشريط الجانبي.
  const { pendingReviewCount, pendingMemoryCount } = useAdminBadges();
  const [mobileOpen, setMobileOpen] = useState(false);

  // تتبّع حالة طيّ الشريط الجانبي حتى نتمكن من ضبط إزاحة منطقة المحتوى الرئيسية.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("admin-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // المزامنة بين الألسنة: يُطلَق حدث `storage` الأصلي عند كتابة لسان آخر.
    const handler = () => {
      setSidebarCollapsed(
        localStorage.getItem("admin-sidebar-collapsed") === "true"
      );
    };
    window.addEventListener("storage", handler);

    // عمليات الكتابة في localStorage داخل النافذة نفسها لا تُطلق حدث storage،
    // لذا نلجأ إلى الاستقصاء (polling) كحلٍّ احتياطي.
    const interval = setInterval(() => {
      const val =
        localStorage.getItem("admin-sidebar-collapsed") === "true";
      setSidebarCollapsed((prev) => (prev !== val ? val : prev));
    }, 200);

    return () => {
      window.removeEventListener("storage", handler);
      clearInterval(interval);
    };
  }, []);

  return (
    // يبثّ AdminEventProvider أحداث الإدارة عبر الصفحات (مثل تحديثات البيانات).
    <AdminEventProvider>
      <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] text-[#323D50] dark:text-[#F5F5F5]">
        <AdminSidebar
          pendingReviewCount={pendingReviewCount}
          pendingMemoryCount={pendingMemoryCount}
        />
        <MobileAdminSidebar
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          pendingReviewCount={pendingReviewCount}
          pendingMemoryCount={pendingMemoryCount}
        />

        <div
          className={`${
            // إزاحة المحتوى بمقدار عرض الشريط الجانبي الحالي (مطوي مقابل مُوسَّع).
            sidebarCollapsed ? "lg:ps-[72px]" : "lg:ps-64"
          } transition-all duration-300`}
        >
          <AdminTopBar onMobileMenuToggle={() => setMobileOpen(true)} />
          <main className="p-6">
            {/* تُعرض صفحة المورد المدفوعة بالمسار هنا. */}
            <Outlet />
          </main>
        </div>
      </div>
    </AdminEventProvider>
  );
}

// ---------------------------------------------------------------------------
// جذر التخطيط
// ---------------------------------------------------------------------------

/**
 * AdminLayout — التصدير الافتراضي الموصول كمسار الغلاف في AdminApp.
 * مفتاح المصادقة: يعرض بوابة تسجيل الدخول عند عدم المصادقة، وإلا فيعرض الغلاف
 * الكامل بعد المصادقة (الشريط الجانبي/العلوي + <Outlet /> المدفوع بالمسارات).
 *
 * @returns بوابة تسجيل الدخول أو غلاف الإدارة بعد المصادقة.
 */
export default function AdminLayout() {
  const { isAuthenticated } = useAdminAuth();

  // حجب واجهة الإدارة بالكامل خلف فحص مصادقة الإدارة المخصّص.
  if (!isAuthenticated) {
    return <AdminLoginGate />;
  }

  return <AuthenticatedShell />;
}
