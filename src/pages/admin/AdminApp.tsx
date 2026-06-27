// ===========================================================================
// AdminApp.tsx — نقطة الدخول (ENTRY POINT) لتطبيق لوحة الإدارة المستقل.
// يُركَّب على المسار /admin/* بواسطة App.tsx الرئيسي. يمتلك Router الخاص به
// ومجموعته الخاصة من الـ Providers (منفصلة عن الموقع العام) بحيث تعمل لوحة
// الإدارة كتطبيق معزول له سِمته (theme) ولغته وحالة مصادقة الإدارة الخاصة به.
// ===========================================================================

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AdminLayout from "./AdminLayout";
import OverviewPage from "./pages/OverviewPage";
import OrdersPage from "./pages/OrdersPage";
import PerfumesPage from "./pages/PerfumesPage";
import ReviewsPage from "./pages/ReviewsPage";
import GiftOrdersPage from "./pages/GiftOrdersPage";
import MemoriesPage from "./pages/MemoriesPage";
import CouponsPage from "./pages/CouponsPage";
import "@/App.css";

/**
 * AdminApp — المكوّن الجذري (root) للوحة الإدارة.
 *
 * يغلِّف كل شيء داخل سلسلة الـ Providers الخاصة بالإدارة:
 *   ThemeProvider → LanguageProvider → AdminAuthProvider → Router
 * (تُعاد الاستفادة من السِمة واللغة من التطبيق العام؛ أما AdminAuthProvider فهو
 * نظام مصادقة الإدارة المخصّص المعتمد على localStorage، وهو منفصل عن مصادقة
 * المستخدم عبر Supabase).
 *
 * يعرّف جدول المسارات المتداخلة: مسار غلاف واحد (AdminLayout) يعرض <Outlet />
 * تُركَّب داخله كل صفحة مورد (Overview، Orders، Perfumes ...). المسار الافتراضي
 * (index) هو لوحة المعلومات Overview.
 *
 * @returns تطبيق الإدارة الكامل موصولًا بالـ Providers والمسارات الخاصة به.
 */
export default function AdminApp() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AdminAuthProvider>
          <Router>
            <Routes>
              {/* مسار الغلاف: يوفّر AdminLayout الشريط الجانبي/العلوي + بوابة
                  تسجيل الدخول، وتُعرض المسارات الفرعية داخل <Outlet /> الخاص به. */}
              <Route element={<AdminLayout />}>
                <Route index element={<OverviewPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="perfumes" element={<PerfumesPage />} />
                <Route path="reviews" element={<ReviewsPage />} />
                <Route path="gift-orders" element={<GiftOrdersPage />} />
                <Route path="memories" element={<MemoriesPage />} />
                <Route path="coupons" element={<CouponsPage />} />
              </Route>
            </Routes>
            {/* منفذ إشعارات Sonner toast المحصور ضمن تطبيق الإدارة. */}
            <Toaster />
          </Router>
        </AdminAuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
