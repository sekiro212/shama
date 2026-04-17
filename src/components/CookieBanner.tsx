import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Cookie, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const CONSENT_KEY = "shama-cookies-accepted";

export default function CookieBanner() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss("dismissed");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  const dismiss = (value: "accepted" | "dismissed") => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      /* localStorage blocked — just close */
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label={t("cookieBanner.ariaLabel")}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-x-0 bottom-0 sm:bottom-4 z-[60] flex justify-center px-3 sm:px-6 pb-3 sm:pb-0 pointer-events-none"
        >
          <div className="pointer-events-auto w-full sm:max-w-3xl glass-card rounded-2xl border border-warm/30 px-4 sm:px-6 py-4 sm:py-5 shadow-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-warm/15 text-warm shrink-0">
                  <Cookie className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm leading-relaxed text-[#323D50] dark:text-white/85">
                    {t("cookieBanner.body")}
                  </p>
                  <Link
                    to="/cookies"
                    onClick={() => dismiss("dismissed")}
                    className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-warm hover:text-warm-glow transition-colors"
                  >
                    {t("cookieBanner.learnMore")}
                    <ArrowRight className="w-3 h-3" aria-hidden />
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => dismiss("dismissed")}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-xl text-sm font-medium text-[#323D50] dark:text-white/80 hover:bg-[#323D50]/5 dark:hover:bg-white/10 transition-colors"
                >
                  {t("cookieBanner.later")}
                </button>
                <button
                  type="button"
                  onClick={() => dismiss("accepted")}
                  className="flex-1 sm:flex-none min-h-[44px] px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] glow-warm-hover"
                >
                  {t("cookieBanner.accept")}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
