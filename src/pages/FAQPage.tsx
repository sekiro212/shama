import { motion, useReducedMotion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";

const SECTIONS: { key: string; questions: string[] }[] = [
  { key: "ordering", questions: ["q1", "q2", "q3"] },
  { key: "shipping", questions: ["q1", "q2", "q3", "q4"] },
  { key: "products", questions: ["q1", "q2", "q3"] },
  { key: "support", questions: ["q1", "q2"] },
];

export default function FAQPage() {
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
            {t("faq.eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-[#323D50] dark:text-[#F5F5F5]">
            {t("faq.title")}
          </h1>
          <p className="mt-5 text-base md:text-lg text-[#6B7B8D] dark:text-white/70 leading-relaxed">
            {t("faq.lede")}
          </p>
        </motion.header>

        <div className="space-y-8">
          {SECTIONS.map((section, sIdx) => (
            <section
              key={section.key}
              className="glass-card rounded-3xl p-5 md:p-8"
            >
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-display text-xs tracking-[0.3em] text-warm/80">
                  {String(sIdx + 1).padStart(2, "0")}
                </span>
                <h2 className="font-display text-xl md:text-2xl font-semibold text-[#1E2A3D] dark:text-[#F5F5F5]">
                  {t(`faq.sections.${section.key}.heading`)}
                </h2>
              </div>

              <Accordion
                type="single"
                collapsible
                className="w-full divide-y divide-[#323D50]/10 dark:divide-white/10"
              >
                {section.questions.map((q) => {
                  const aKey = q.replace("q", "a");
                  return (
                    <AccordionItem
                      key={q}
                      value={`${section.key}-${q}`}
                      className="border-0"
                    >
                      <AccordionTrigger className="!py-4 !px-0 text-start text-[15px] md:text-base font-medium !text-[#1E2A3D] dark:!text-[#F5F5F5] hover:no-underline !bg-transparent !border-0 !rounded-none [backdrop-filter:none] [-webkit-text-fill-color:currentColor]">
                        {t(`faq.sections.${section.key}.${q}`)}
                      </AccordionTrigger>
                      <AccordionContent className="text-[15px] leading-relaxed text-[#323D50]/85 dark:text-white/75 pb-5">
                        {t(`faq.sections.${section.key}.${aKey}`)}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
