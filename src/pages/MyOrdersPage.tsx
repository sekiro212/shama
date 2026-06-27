/**
 * MyOrdersPage — سجلّ طلبات العميل المسجَّل (المسار: /my-orders).
 *
 * صفحة محميّة خلف مستخدم Supabase مسجَّل الدخول، تعرض كل طلب مرتبط بحسابه
 * مع تتبّع حالته. التخطيط رئيسي/تفصيلي:
 * شريط جانبي بالطلبات + لوحة تفاصيل على الشاشات الكبيرة؛ وعلى الجوال يتنقّل بين
 * القائمة وطلب واحد في كل مرة.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package,
  ShoppingBag,
  Loader2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyOrders, type Order } from "@/services/ordersService";
import OrderDetailView from "@/components/OrderDetailView";

// يربط كل حالة طلب (status) بتنسيق "الشارة" الملوّنة المستخدمة في القائمة.
const STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  confirmed: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  processing: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  accepted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  shipped: "bg-warm/15 text-warm",
  delivered: "bg-green-500/15 text-green-600 dark:text-green-400",
  returned: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

/**
 * يحمّل طلبات المستخدم المسجَّل ويختار الأحدث تلقائيًا، ويعيد توجيه الزوار غير
 * المسجَّلين إلى /login.
 */
const MyOrdersPage = () => {
  const { t, language, isRTL } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ننتظر انتهاء تحميل حالة المصادقة أولًا؛ فإن لم يوجد مستخدم نعيد التوجيه إلى
  // تسجيل الدخول (مع تذكّر وجهة العودة)، وإلا نجلب طلباته ونفتح الأحدث افتراضيًا.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { state: { from: "/my-orders" } });
      return;
    }
    setLoading(true);
    fetchMyOrders(user.id, user.email).then((data) => {
      setOrders(data);
      if (data.length > 0) setSelectedId(data[0].id);
      setLoading(false);
    });
  }, [user, authLoading, navigate]);

  // الطلب المعروض حاليًا، محسوب من المعرّف المختار (useMemo لتفادي إعادة الحساب).
  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId]
  );

  // تنسيق تاريخ محلّي — لغة عربية ليبية في وضع RTL، وإنجليزية أمريكية خلاف ذلك.
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(
      language === "ar" ? "ar-LY" : "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-warm" />
      </div>
    );
  }

  const initial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 };
  const animate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <div className="grain-bg relative min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] pt-20 sm:pt-24 pb-16 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-warm/15 blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-96 h-96 rounded-full bg-[#5B8DD9]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <motion.header
          initial={initial}
          animate={animate}
          transition={{ duration: 0.35 }}
          className="mb-8 sm:mb-12"
        >
          <p className="font-display text-[11px] sm:text-xs tracking-[0.4em] text-warm uppercase">
            {t("myOrders.eyebrow")}
          </p>
          <h1 className="font-display text-3xl sm:text-5xl text-[#1E2A3D] dark:text-[#F5F5F5] mt-2 text-glow-warm">
            {t("myOrders.title")}
          </h1>
          <p className="mt-3 font-display italic text-[#6B7B8D] dark:text-white/60 max-w-xl">
            {t("myOrders.description")}
          </p>
        </motion.header>

        {orders.length === 0 ? (
          <motion.div
            initial={initial}
            animate={animate}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="glass-card rounded-3xl p-10 sm:p-14 text-center max-w-xl mx-auto"
          >
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-warm/15 flex items-center justify-center">
              <Package className="w-8 h-8 text-warm" />
            </div>
            <h3 className="font-display text-2xl text-[#323D50] dark:text-[#F5F5F5] mb-2">
              {t("myOrders.empty")}
            </h3>
            <p className="text-[#6B7B8D] dark:text-white/60 mb-7">
              {t("myOrders.emptyDesc")}
            </p>
            <Link to="/collection">
              <Button className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white rounded-2xl h-12 px-6 font-display glow-warm-hover">
                <ShoppingBag className="w-4 h-4 me-2" />
                {t("myOrders.startShopping")}
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6 lg:gap-8">
            {/* Left rail — orders list */}
            <motion.aside
              initial={initial}
              animate={animate}
              transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.05 }}
              className={`lg:block ${selected ? "hidden" : "block"}`}
            >
              <div className="glass-card rounded-3xl p-4 sm:p-5 space-y-2 lg:sticky lg:top-24 self-start">
                <p className="font-display text-[11px] tracking-[0.32em] text-warm uppercase px-2 pb-2">
                  {orders.length}{" "}
                  {orders.length === 1 ? t("myOrders.item") : t("myOrders.items")}
                </p>
                <ul className="space-y-2 max-h-[70vh] overflow-y-auto scrollbar-hide">
                  {orders.map((order) => {
                    const isActive = order.id === selectedId;
                    const statusColor =
                      STATUS_PILL[order.status] ?? STATUS_PILL.pending;
                    return (
                      <li key={order.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(order.id)}
                          aria-current={isActive}
                          className={`w-full text-start rounded-2xl p-4 transition-all duration-200 border ${
                            isActive
                              ? "border-warm bg-warm/10 glow-warm"
                              : "border-transparent hover:bg-warm/5 hover:border-warm/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm text-[#323D50] dark:text-[#F5F5F5] tabular-nums">
                              #{order.id.slice(0, 8)}
                            </span>
                            <ChevronRight
                              className={`w-4 h-4 text-warm/60 ${
                                isRTL ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                          <p className="text-xs text-[#6B7B8D] dark:text-white/60 mt-1">
                            {formatDate(order.order_date || order.created_at)}
                          </p>
                          <div className="flex items-center justify-between mt-2.5 gap-2">
                            <span
                              className={`text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full font-display ${statusColor}`}
                            >
                              {t(`timeline.${order.status}`) || order.status}
                            </span>
                            <span className="font-display tabular-nums text-sm text-[#323D50] dark:text-[#F5F5F5]">
                              {order.total?.toFixed(2)}{" "}
                              <span className="text-[10px] text-warm">LYD</span>
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.aside>

            {/* Right pane — detail */}
            <div className={`lg:block ${selected ? "block" : "hidden"} min-w-0`}>
              {selected ? (
                <>
                  {/* Mobile back */}
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden mb-4 -ml-2 h-9 px-2 text-[#6B7B8D] dark:text-white/60 hover:bg-warm/10 hover:text-warm"
                  >
                    <ArrowLeft
                      className={`w-4 h-4 me-2 ${isRTL ? "rotate-180" : ""}`}
                    />
                    <span className="text-xs tracking-widest uppercase">
                      {t("myOrders.title")}
                    </span>
                  </Button>
                  <OrderDetailView order={selected} variant="account" />
                </>
              ) : (
                <div className="glass-card rounded-3xl p-8 text-center text-[#6B7B8D] dark:text-white/60">
                  {t("myOrders.empty")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
