/**
 * ============================================================================
 * صفحة "معلومات الشحن" (Shipping) — المسار: /shipping
 * ----------------------------------------------------------------------------
 * صفحة شبه ثابتة توضّح نطاق التغطية، مدد التوصيل، الرسوم، طرق الدفع، وتتبّع
 * الطلب. أغلب الأقسام نص بسيط، باستثناء:
 *   - قسم الدفع (payment): يحتوي قائمة بطرق الدفع (الدفع عند الاستلام/تحويل بنكي).
 *   - قسم التتبّع (tracking): يحتوي زرّ انتقال (CTA) إلى صفحة تتبّع الطلب.
 * النصوص ثنائية اللغة عبر دالة الترجمة t().
 * ============================================================================
 */
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Package, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * المكوّن الرئيسي لصفحة معلومات الشحن.
 */
export default function ShippingPage() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  // أقسام الصفحة؛ بعضها يحمل علمًا خاصًّا: hasList لقائمة الدفع، hasCta لزرّ التتبّع
  const sections = [
    { key: "coverage" },
    { key: "times" },
    { key: "fees" },
    { key: "payment", hasList: true },
    { key: "tracking", hasCta: true },
    { key: "support" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] pt-24 md:pt-28 pb-16 sm:pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.header
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-10"
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-warm">
            {t("shipping.eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-[#323D50] dark:text-[#F5F5F5]">
            {t("shipping.title")}
          </h1>
          <p className="mt-5 text-base md:text-lg text-[#6B7B8D] dark:text-white/70 leading-relaxed">
            {t("shipping.lede")}
          </p>
        </motion.header>

        <article className="glass-card rounded-3xl p-6 md:p-10 space-y-8 prose-shama">
          {sections.map((section, idx) => (
            <section key={section.key}>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-xs tracking-[0.3em] text-warm/80">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h2>{t(`shipping.${section.key}.heading`)}</h2>
              </div>
              {/* عرض القسم كقائمة طرق دفع إن كان hasList، وإلا فقرة نصية عادية */}
              {"hasList" in section && section.hasList ? (
                <>
                  <p>{t(`shipping.${section.key}.intro`)}</p>
                  <ul>
                    <li>{t(`shipping.${section.key}.cod`)}</li>
                    <li>{t(`shipping.${section.key}.bank`)}</li>
                  </ul>
                </>
              ) : (
                <p>{t(`shipping.${section.key}.body`)}</p>
              )}
              {/* زرّ الانتقال إلى سجلّ طلبات الحساب — يظهر فقط في القسم المعلَّم بـ hasCta */}
              {"hasCta" in section && section.hasCta && (
                <Link
                  to="/my-orders"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white text-sm font-semibold glow-warm-hover no-underline"
                >
                  <Package className="w-4 h-4" aria-hidden />
                  {t(`shipping.${section.key}.cta`)}
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              )}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
