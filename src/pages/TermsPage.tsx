import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const SECTIONS = [
  "acceptance",
  "products",
  "pricing",
  "orders",
  "payment",
  "ip",
  "liability",
  "law",
] as const;

export default function TermsPage() {
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
            {t("terms.eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-[#323D50] dark:text-[#F5F5F5]">
            {t("terms.title")}
          </h1>
          <p className="mt-2 text-xs tracking-[0.2em] uppercase text-[#6B7B8D]">
            {t("terms.updated")}
          </p>
          <p className="mt-5 text-base md:text-lg text-[#6B7B8D] dark:text-white/70 leading-relaxed">
            {t("terms.lede")}
          </p>
        </motion.header>

        <article className="glass-card rounded-3xl p-6 md:p-10 space-y-8 prose-shama">
          {SECTIONS.map((key, idx) => (
            <section key={key}>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-xs tracking-[0.3em] text-warm/80">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h2>{t(`terms.${key}.heading`)}</h2>
              </div>
              <p>{t(`terms.${key}.body`)}</p>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
