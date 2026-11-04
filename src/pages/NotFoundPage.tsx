/**
 * ============================================================================
 * صفحة "غير موجودة" (404) — المسار: * (كل مسار غير معروف)
 * ----------------------------------------------------------------------------
 * قبل وجود هذه الصفحة كان أي مسار خاطئ يعرض صفحة بيضاء: الهيدر والفوتر فقط
 * بلا شيء بينهما، لأنّ <Routes> لم يكن فيه مسار احتياطي. والأسوأ أنّ ملف
 * .htaccess يحوّل كل المسارات إلى index.html، فيُرجع الخادم 200 لا 404 —
 * فتفهرس محرّكات البحث صفحاتٍ فارغة على أنّها صفحات صالحة.
 *
 * الروابط المعروضة ليست زينة: الزائر الذي وصل إلى مسار ميّت (رابط قديم، أو
 * /track-order بعد إزالة صفحة التتبّع) يحتاج مخرجًا، لا طريقًا مسدودًا.
 * ============================================================================
 */
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Home, Gem, FlaskConical, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NotFoundPage() {
  const { t, isRTL } = useLanguage();
  const reduce = useReducedMotion();

  const links = [
    { to: "/", Icon: Home, label: t("notFound.home") },
    { to: "/collection", Icon: Gem, label: t("notFound.collection") },
    { to: "/samples", Icon: FlaskConical, label: t("notFound.samples") },
    { to: "/my-orders", Icon: Package, label: t("notFound.orders") },
  ];

  return (
    <div className="min-h-[70dvh] bg-[#F8F9FB] dark:bg-[#1a2235] pt-24 md:pt-28 pb-16 sm:pb-24 flex items-center">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-warm">
            {t("notFound.eyebrow")}
          </p>

          {/* الرقم زخرفي بحت — النصّ المقروء تحته، وaria-hidden يمنع قارئ الشاشة
              من نطق "404" قبل الجملة المفهومة. */}
          <p
            aria-hidden="true"
            className="mt-4 font-display text-7xl md:text-8xl font-semibold text-[#5B8DD9]/25 dark:text-white/15 leading-none select-none"
          >
            404
          </p>

          <h1 className="mt-2 font-display text-3xl md:text-4xl font-semibold text-[#323D50] dark:text-[#F5F5F5]">
            {t("notFound.title")}
          </h1>

          <p className="mt-5 text-base md:text-lg text-[#6B7B8D] dark:text-white/70 leading-relaxed">
            {t("notFound.lede")}
          </p>

          <nav
            aria-label={t("notFound.eyebrow")}
            className="mt-9 grid grid-cols-2 gap-3 sm:gap-4"
          >
            {links.map(({ to, Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="glass-card rounded-2xl px-4 py-4 flex items-center justify-center gap-2.5 text-sm font-medium text-[#323D50] dark:text-white/85 hover:bg-[#5B8DD9]/10 dark:hover:bg-white/5 transition-colors motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B8DD9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F9FB] dark:focus-visible:ring-offset-[#1a2235]"
              >
                <Icon className="w-4 h-4 text-[#3E6BB5] dark:text-[#8BB4F0]" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>

          <Link
            to="/collection"
            className={`mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#5B8DD9] hover:text-[#3E6BB5] transition-colors ${
              isRTL ? "flex-row-reverse" : ""
            }`}
          >
            {t("notFound.cta")}
            <span aria-hidden className={isRTL ? "rotate-180 inline-block" : ""}>
              →
            </span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
