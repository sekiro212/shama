/**
 * AdminTopBar — مكوّن واجهة مشترك في لوحة الإدارة.
 *
 * الشريط العلوي الثابت للوحة الإدارة. يعرض زر فتح القائمة الجانبية على
 * الشاشات الصغيرة، وعنوان الصفحة الحالية المشتقّ من مسار التنقّل (route).
 */
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AdminTopBarProps {
  onMobileMenuToggle: () => void;
}

// خريطة من مسار الصفحة إلى مفتاح الترجمة لعنوانها.
const PAGE_TITLE_MAP: Record<string, string> = {
  "/": "admin.nav.overview",
  "/orders": "admin.nav.orders",
  "/perfumes": "admin.nav.products",
  "/reviews": "admin.nav.reviews",
  "/gift-orders": "admin.nav.giftOrders",
  "/memories": "admin.nav.memories",
  "/coupons": "admin.nav.coupons",
};

// عناوين احتياطية تُستخدم عندما لا تتوفّر ترجمة للمفتاح.
const FALLBACK_TITLES: Record<string, string> = {
  "/": "Overview",
  "/orders": "Orders",
  "/perfumes": "Products",
  "/reviews": "Reviews",
  "/gift-orders": "Gift Orders",
  "/memories": "Memories",
  "/coupons": "Coupons",
};

/**
 * يعرض الشريط العلوي للوحة الإدارة مع عنوان الصفحة الحالية.
 *
 * @param onMobileMenuToggle - دالة تُستدعى لفتح/إغلاق القائمة الجانبية للجوال.
 */
export function AdminTopBar({ onMobileMenuToggle }: AdminTopBarProps) {
  const { pathname } = useLocation();
  const { t } = useLanguage();

  // اشتقاق عنوان الصفحة من المسار الحالي: نحاول الترجمة أولًا، فإن لم تتوفّر
  // (أي أعادت t نفس المفتاح) نستخدم العنوان الاحتياطي الإنجليزي.
  const translationKey = PAGE_TITLE_MAP[pathname];
  const fallback = FALLBACK_TITLES[pathname] || "Admin";
  const pageTitle = translationKey
    ? (() => {
        const translated = t(translationKey);
        return translated !== translationKey ? translated : fallback;
      })()
    : fallback;

  return (
    <header className="sticky top-0 z-20 h-14 bg-[#F8F9FB]/80 dark:bg-[#1a2235]/80 backdrop-blur-xl border-b border-[#323D50]/10 dark:border-white/10">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden w-9 h-9 rounded-xl"
            onClick={onMobileMenuToggle}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-[#323D50] dark:text-white">
            {pageTitle}
          </h1>
        </div>

        <div />
      </div>
    </header>
  );
}
