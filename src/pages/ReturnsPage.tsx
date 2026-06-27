/**
 * ============================================================================
 * صفحة "سياسة الإرجاع والاستبدال" (Returns) — المسار: /returns
 * ----------------------------------------------------------------------------
 * صفحة ثابتة توضّح شروط الإرجاع: مدّة الإرجاع، حالة المنتج المقبولة، آلية
 * الاسترداد، المنتجات غير القابلة للإرجاع، وكيفية بدء طلب الإرجاع.
 * تنتهي بمربّع تنبيه (callout) يطمئن العميل بشأن ضمان الجودة.
 * النصوص ثنائية اللغة عبر دالة الترجمة t().
 * ============================================================================
 */
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * المكوّن الرئيسي لصفحة سياسة الإرجاع.
 * ملاحظة: الأقسام مكتوبة يدويًا (وليست عبر تكرار) مع ترقيم ثابت من 01 إلى 05.
 */
export default function ReturnsPage() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

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
            {t("returns.eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-[#323D50] dark:text-[#F5F5F5]">
            {t("returns.title")}
          </h1>
          <p className="mt-5 text-base md:text-lg text-[#6B7B8D] dark:text-white/70 leading-relaxed">
            {t("returns.lede")}
          </p>
        </motion.header>

        <article className="glass-card rounded-3xl p-6 md:p-10 space-y-8 prose-shama">
          <section>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-xs tracking-[0.3em] text-warm/80">01</span>
              <h2>{t("returns.window.heading")}</h2>
            </div>
            <p>{t("returns.window.body")}</p>
          </section>

          <section>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-xs tracking-[0.3em] text-warm/80">02</span>
              <h2>{t("returns.condition.heading")}</h2>
            </div>
            <p>{t("returns.condition.body")}</p>
          </section>

          <section>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-xs tracking-[0.3em] text-warm/80">03</span>
              <h2>{t("returns.mechanism.heading")}</h2>
            </div>
            <p>{t("returns.mechanism.body")}</p>
          </section>

          <section>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-xs tracking-[0.3em] text-warm/80">04</span>
              <h2>{t("returns.nonReturnable.heading")}</h2>
            </div>
            <ul>
              <li>{t("returns.nonReturnable.item1")}</li>
              <li>{t("returns.nonReturnable.item2")}</li>
              <li>{t("returns.nonReturnable.item3")}</li>
              <li>{t("returns.nonReturnable.item4")}</li>
            </ul>
          </section>

          <section>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-xs tracking-[0.3em] text-warm/80">05</span>
              <h2>{t("returns.start.heading")}</h2>
            </div>
            <p>{t("returns.start.body")}</p>
          </section>

          {/* مربّع تنبيه ختامي بأيقونة درع يؤكّد التزام المتجر بضمان الجودة */}
          <aside
            role="note"
            className="mt-8 flex items-start gap-4 rounded-2xl border border-warm/40 bg-warm/10 dark:bg-warm/15 p-5"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warm/25 text-warm shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden />
            </div>
            <p className="text-sm md:text-base leading-relaxed text-[#1E2A3D] dark:text-[#F5F5F5] m-0">
              {t("returns.callout")}
            </p>
          </aside>
        </article>
      </div>
    </div>
  );
}
