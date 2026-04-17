import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const SECTIONS = ["name", "atelier", "promise"] as const;

export default function AboutPage() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] pt-24 md:pt-28 pb-16 sm:pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.header
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-10 text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 glass rounded-2xl border border-warm/30 mb-6 overflow-hidden">
            <img
              src="/shama-logo.jpg"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <p className="font-display text-xs tracking-[0.3em] uppercase text-warm">
            {t("about.eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-[#323D50] dark:text-[#F5F5F5] leading-tight">
            {t("about.title")}
          </h1>
          <p className="mt-5 text-base md:text-lg text-[#6B7B8D] dark:text-white/70 leading-relaxed">
            {t("about.lede")}
          </p>
        </motion.header>

        <article className="glass-card rounded-3xl p-6 md:p-10 space-y-8 prose-shama">
          {SECTIONS.map((key, idx) => (
            <section key={key}>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-xs tracking-[0.3em] text-warm/80">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h2>{t(`about.${key}.heading`)}</h2>
              </div>
              <p>{t(`about.${key}.body`)}</p>
            </section>
          ))}

          <figure className="mt-10 pt-8 border-t border-warm/20 text-center">
            <blockquote className="font-display italic text-2xl md:text-3xl text-[#1E2A3D] dark:text-[#F5F5F5] leading-snug">
              &ldquo;{t("about.pullquote")}&rdquo;
            </blockquote>
            <figcaption className="mt-4 text-xs tracking-[0.3em] uppercase text-warm">
              {t("about.signature")}
            </figcaption>
          </figure>
        </article>
      </div>
    </div>
  );
}
