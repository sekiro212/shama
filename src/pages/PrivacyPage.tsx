/**
 * ============================================================================
 * صفحة "سياسة الخصوصية" (Privacy) — المسار: /privacy
 * ----------------------------------------------------------------------------
 * صفحة ثابتة قانونية توضّح كيفية جمع بيانات العميل وتخزينها وحقوقه فيها.
 * بعض الأقسام نص بسيط (body) وبعضها يحتوي مقدّمة (intro) متبوعة بقائمة نقاط.
 * النصوص ثنائية اللغة عبر دالة الترجمة t().
 * ============================================================================
 */
import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * المكوّن الرئيسي لصفحة سياسة الخصوصية.
 */
export default function PrivacyPage() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  // تعريف أقسام السياسة: hasList يحدّد إن كان القسم قائمة نقاط، وintro وجود مقدّمة قبلها
  const sections = [
    { key: "collect", hasList: true, intro: true },
    { key: "store", hasList: false },
    { key: "never", hasList: true, intro: true },
    { key: "thirdParties", hasList: true, intro: true },
    { key: "rights", hasList: false },
    { key: "children", hasList: false },
    { key: "updates", hasList: false },
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
            {t("privacy.eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-[#323D50] dark:text-[#F5F5F5]">
            {t("privacy.title")}
          </h1>
          <p className="mt-2 text-xs tracking-[0.2em] uppercase text-[#6B7B8D]">
            {t("privacy.updated")}
          </p>
          <p className="mt-5 text-base md:text-lg text-[#6B7B8D] dark:text-white/70 leading-relaxed">
            {t("privacy.lede")}
          </p>
        </motion.header>

        {/* عرض الأقسام: قائمة نقاط (مع مقدّمة اختيارية) أو فقرة نصية حسب نوع القسم */}
        <article className="glass-card rounded-3xl p-6 md:p-10 space-y-8 prose-shama">
          {sections.map((section) => (
            <section key={section.key}>
              <h2>{t(`privacy.${section.key}.heading`)}</h2>
              {section.hasList ? (
                <>
                  {section.intro && <p>{t(`privacy.${section.key}.intro`)}</p>}
                  <ul>
                    {["item1", "item2", "item3", "item4"].map((item) => (
                      <li key={item}>{t(`privacy.${section.key}.${item}`)}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>{t(`privacy.${section.key}.body`)}</p>
              )}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
