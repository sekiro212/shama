/**
 * ملف: AdminSidebar.tsx
 * الدور: الشريط الجانبي للتنقّل في لوحة التحكم. يوفّر نسختين: نسخة سطح المكتب الثابتة
 * القابلة للطيّ (AdminSidebar) ونسخة الجوال المنبثقة عبر لوحة جانبية (MobileAdminSidebar).
 * يعرض روابط الأقسام مع شارات العدّ للعناصر المعلّقة (مراجعات/ذكريات)، إضافةً إلى أدوات
 * تبديل السمة واللغة وتسجيل الخروج. يدعم الاتجاهين (RTL/LTR).
 */
import { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Star,
  Gift,
  Heart,
  Ticket,
  Sun,
  Moon,
  Globe,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

// مفتاح localStorage لحفظ حالة طيّ الشريط الجانبي بين الجلسات
const STORAGE_KEY = "admin-sidebar-collapsed";

interface NavItem {
  path: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
  badgeKey?: string;
}

// إعداد روابط التنقّل: مصدر واحد للحقيقة لأقسام لوحة التحكم. لكل عنصر مساره وأيقونته
// ومفتاح الترجمة، و badgeKey اختياري للأقسام التي تعرض شارة عدّ (المراجعات والذكريات المعلّقة)
const navItems: NavItem[] = [
  { path: "/", icon: LayoutDashboard, labelKey: "admin.nav.overview" },
  { path: "/orders", icon: ShoppingCart, labelKey: "admin.nav.orders" },
  { path: "/perfumes", icon: Package, labelKey: "admin.nav.products" },
  { path: "/reviews", icon: Star, labelKey: "admin.nav.reviews", badgeKey: "reviews" },
  { path: "/gift-orders", icon: Gift, labelKey: "admin.nav.giftOrders" },
  { path: "/memories", icon: Heart, labelKey: "admin.nav.memories", badgeKey: "memories" },
  { path: "/coupons", icon: Ticket, labelKey: "admin.nav.coupons" },
];

// تسميات احتياطية بالإنجليزية تُستخدم عند غياب مفتاح الترجمة، حتى لا يظهر المفتاح الخام للمستخدم
const FALLBACK_LABELS: Record<string, string> = {
  "admin.nav.overview": "Overview",
  "admin.nav.orders": "Orders",
  "admin.nav.products": "Products",
  "admin.nav.reviews": "Reviews",
  "admin.nav.giftOrders": "Gift Orders",
  "admin.nav.memories": "Memories",
  "admin.nav.coupons": "Coupons",
  "admin.logoutSuccess": "Logged out successfully",
};

interface AdminSidebarProps {
  pendingReviewCount?: number;
  pendingMemoryCount?: number;
}

interface MobileAdminSidebarProps extends AdminSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * خطّاف مساعد يُعيد النص المترجَم لمفتاح ما.
 * إذا أرجعت دالة الترجمة المفتاح نفسه (أي لا توجد ترجمة) يلجأ إلى التسمية الاحتياطية.
 */
function useLabel(key: string): string {
  const { t } = useLanguage();
  const translated = t(key);
  // إن ساوى الناتج المفتاح نفسه فهذا يعني عدم وجود ترجمة، فنستخدم البديل الاحتياطي
  if (translated !== key) return translated;
  return FALLBACK_LABELS[key] ?? key;
}

/**
 * يحسب قيمة شارة العدّ لعنصر تنقّل بحسب نوع شارته (badgeKey).
 * يُعيد العدد فقط إذا كان موجبًا، وإلا undefined كي لا تظهر الشارة أصلًا.
 */
function getBadgeCount(
  badgeKey: string | undefined,
  pendingReviewCount?: number,
  pendingMemoryCount?: number,
): number | undefined {
  if (!badgeKey) return undefined;
  if (badgeKey === "reviews" && pendingReviewCount && pendingReviewCount > 0) return pendingReviewCount;
  if (badgeKey === "memories" && pendingMemoryCount && pendingMemoryCount > 0) return pendingMemoryCount;
  return undefined;
}

/**
 * عنصر رابط واحد في الشريط الجانبي.
 * يعرض الأيقونة والتسمية وشارة العدّ، ويبرز الحالة النشطة عبر NavLink. في وضع الطيّ يظهر
 * تلميح (tooltip) بالاسم لأن النص يكون مخفيًا.
 */
function SidebarNavItem({
  item,
  collapsed,
  badgeCount,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  badgeCount?: number;
  onClick?: () => void;
}) {
  const label = useLabel(item.labelKey);
  const Icon = item.icon;

  const linkContent = (
    <NavLink
      to={item.path}
      // المطابقة الدقيقة (end) للمسار الجذر "/" فقط، حتى لا يبقى رابط النظرة العامة نشطًا في كل المسارات
      end={item.path === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "group flex items-center gap-3 rounded-xl transition-colors duration-200 cursor-pointer relative",
          collapsed ? "justify-center px-3 py-3" : "px-3 py-2.5",
          isActive
            ? "bg-[#5B8DD9]/15 text-[#5B8DD9] dark:text-[#5B8DD9] border-s-[3px] border-[#5B8DD9]"
            : "text-[#6B7B8D] hover:bg-[#5B8DD9]/10 hover:text-[#323D50] dark:hover:text-[#F5F5F5] border-s-[3px] border-transparent",
        ].join(" ")
      }
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && (
        <>
          <span className="text-sm font-medium truncate">{label}</span>
          {badgeCount !== undefined && (
            <Badge className="ms-auto bg-amber-500 text-white text-xs px-1.5 py-0 shrink-0">
              {badgeCount}
            </Badge>
          )}
        </>
      )}
      {/* في وضع الطيّ تظهر الشارة كنقطة صغيرة فوق الأيقونة، وتُختصر الأعداد الكبيرة إلى "9+" */}
      {collapsed && badgeCount !== undefined && (
        <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return linkContent;
}

/**
 * المحتوى المشترك للشريط الجانبي المستخدَم في كلٍّ من نسخة سطح المكتب ونسخة الجوال.
 * يبني الترويسة، وقائمة الروابط، وتذييل المستخدم مع أزرار السمة واللغة وتسجيل الخروج.
 * المعاملات collapsed و showToggle تتحكمان بهيئة العرض (مطويّ/مفرود، إظهار زر الطيّ).
 */
function SidebarContent({
  collapsed,
  onToggleCollapse,
  pendingReviewCount,
  pendingMemoryCount,
  onNavClick,
  showToggle = true,
}: AdminSidebarProps & {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavClick?: () => void;
  showToggle?: boolean;
}) {
  const { t, isRTL, language, setLanguage } = useLanguage();
  const { toggleTheme, isDark } = useTheme();
  const { admin, logout } = useAdminAuth();

  const label = useCallback(
    (key: string) => {
      const translated = t(key);
      return translated !== key ? translated : (FALLBACK_LABELS[key] ?? key);
    },
    [t],
  );

  const adminInitials = admin?.username
    ? admin.username.slice(0, 2).toUpperCase()
    : "AD";

  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-3 px-4 h-16 shrink-0 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
          S
        </div>
        {!collapsed && (
          <span className="font-semibold text-[#323D50] dark:text-white text-base truncate">
            Shama Admin
          </span>
        )}
        {showToggle && !collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="ms-auto w-8 h-8 rounded-lg text-[#6B7B8D] hover:bg-[#5B8DD9]/10 hover:text-[#5B8DD9] cursor-pointer shrink-0"
          >
            <PanelLeftClose className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          </Button>
        )}
      </div>

      {collapsed && showToggle && (
        <div className="flex justify-center px-2 mb-2">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  className="w-8 h-8 rounded-lg text-[#6B7B8D] hover:bg-[#5B8DD9]/10 hover:text-[#5B8DD9] cursor-pointer"
                >
                  <PanelLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* توليد روابط التنقّل من إعداد navItems، مع حساب شارة العدّ لكل عنصر حسب نوعه */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.path}
            item={item}
            collapsed={collapsed}
            badgeCount={getBadgeCount(item.badgeKey, pendingReviewCount, pendingMemoryCount)}
            onClick={onNavClick}
          />
        ))}
      </nav>

      <div className="shrink-0 px-3 pb-4 space-y-2">
        <div className="border-t border-[#323D50]/10 dark:border-white/10 mb-3" />

        {!collapsed && admin && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#5B8DD9]/5 dark:bg-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {adminInitials}
            </div>
            <span className="text-sm font-medium text-[#323D50] dark:text-[#F5F5F5] truncate">
              {admin.username}
            </span>
          </div>
        )}

        {collapsed && admin && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center py-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] flex items-center justify-center text-white text-xs font-bold cursor-default">
                    {adminInitials}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{admin.username}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <div className={`flex ${collapsed ? "flex-col items-center" : "items-center"} gap-1`}>
          {collapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="w-9 h-9 rounded-xl text-[#6B7B8D] hover:bg-[#5B8DD9]/10 hover:text-[#5B8DD9] cursor-pointer"
                  >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isDark ? "Light mode" : "Dark mode"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl text-[#6B7B8D] hover:bg-[#5B8DD9]/10 hover:text-[#5B8DD9] cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          )}

          {collapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLanguage(language === "en" ? "ar" : "en")}
                    className="w-9 h-9 rounded-xl text-[#6B7B8D] hover:bg-[#5B8DD9]/10 hover:text-[#5B8DD9] cursor-pointer"
                  >
                    <Globe className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {language === "en" ? "Arabic" : "English"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              className="h-9 rounded-xl px-3 text-[#6B7B8D] hover:bg-[#5B8DD9]/10 hover:text-[#5B8DD9] cursor-pointer text-sm font-medium"
            >
              <Globe className="w-4 h-4 me-1.5" />
              {language === "en" ? "AR" : "EN"}
            </Button>
          )}

          {!collapsed && <div className="flex-1" />}

          {collapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      logout();
                      toast.success(label("admin.logoutSuccess"));
                    }}
                    className="w-9 h-9 rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {label("admin.shell.logout")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="ghost"
              onClick={() => {
                logout();
                toast.success(label("admin.logoutSuccess"));
              }}
              className="h-9 rounded-xl px-3 text-red-500 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 cursor-pointer text-sm font-medium"
            >
              <LogOut className="w-4 h-4 me-1.5" />
              {label("admin.shell.logout")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * الشريط الجانبي لنسخة سطح المكتب: ثابت على الجانب وقابل للطيّ.
 * يحفظ حالة الطيّ في localStorage ويستعيدها عند إعادة التحميل.
 */
export default function AdminSidebar({ pendingReviewCount, pendingMemoryCount }: AdminSidebarProps) {
  // قراءة حالة الطيّ المحفوظة سابقًا كقيمة ابتدائية (مع التحوّط من تعذّر الوصول إلى localStorage)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // حفظ حالة الطيّ عند كل تغيير لتبقى ثابتة بين الجلسات
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  const toggleCollapse = useCallback(() => setCollapsed((prev) => !prev), []);

  return (
    <aside
      className={[
        "hidden lg:flex fixed top-0 bottom-0 start-0 z-30 flex-col",
        "glass border-e border-[#323D50]/10 dark:border-white/10",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-64",
      ].join(" ")}
    >
      <SidebarContent
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        pendingReviewCount={pendingReviewCount}
        pendingMemoryCount={pendingMemoryCount}
      />
    </aside>
  );
}

/**
 * الشريط الجانبي لنسخة الجوال: يظهر كلوحة منبثقة (Sheet) يتحكم فيها open/onOpenChange.
 * يفتح من الجانب المناسب حسب اتجاه اللغة (يمين في العربية)، ويُغلق ذاتيًا عند الضغط على أي رابط.
 */
export function MobileAdminSidebar({
  open,
  onOpenChange,
  pendingReviewCount,
  pendingMemoryCount,
}: MobileAdminSidebarProps) {
  const { isRTL } = useLanguage();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isRTL ? "right" : "left"}
        className="w-64 p-0 glass border-e border-[#323D50]/10 dark:border-white/10"
      >
        <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
        <SidebarContent
          collapsed={false}
          pendingReviewCount={pendingReviewCount}
          pendingMemoryCount={pendingMemoryCount}
          onNavClick={() => onOpenChange(false)}
          showToggle={false}
        />
      </SheetContent>
    </Sheet>
  );
}
