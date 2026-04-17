import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

type Row = {
  keyName: string;
  purposeKey: string;
  category: "catEssential" | "catFunctional";
};

const ROWS: Row[] = [
  { keyName: "cart", purposeKey: "rows.cart", category: "catFunctional" },
  { keyName: "shama-language", purposeKey: "rows.language", category: "catFunctional" },
  { keyName: "shama-theme", purposeKey: "rows.theme", category: "catFunctional" },
  { keyName: "recently_viewed", purposeKey: "rows.recentlyViewed", category: "catFunctional" },
  { keyName: "wishlist", purposeKey: "rows.wishlist", category: "catFunctional" },
  { keyName: "shama-auth", purposeKey: "rows.auth", category: "catEssential" },
  { keyName: "admin_auth", purposeKey: "rows.adminAuth", category: "catEssential" },
  { keyName: "admin-sidebar-collapsed", purposeKey: "rows.adminSidebar", category: "catFunctional" },
  { keyName: "shama-announcement-dismiss", purposeKey: "rows.announcement", category: "catFunctional" },
  { keyName: "shama-cookies-accepted", purposeKey: "rows.consent", category: "catEssential" },
];

export default function CookiesPage() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] pt-24 md:pt-28 pb-16 sm:pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.header
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-10"
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-warm">
            {t("cookies.eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-[#323D50] dark:text-[#F5F5F5]">
            {t("cookies.title")}
          </h1>
          <p className="mt-2 text-xs tracking-[0.2em] uppercase text-[#6B7B8D]">
            {t("cookies.updated")}
          </p>
          <p className="mt-5 text-base md:text-lg text-[#6B7B8D] dark:text-white/70 leading-relaxed">
            {t("cookies.lede")}
          </p>
        </motion.header>

        <article className="glass-card rounded-3xl p-6 md:p-10 space-y-8 prose-shama">
          <section>
            <h2>{t("cookies.tableHeading")}</h2>

            <div className="mt-5 -mx-2 sm:mx-0 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-start">
                    <th className="px-3 py-3 text-start text-[11px] font-display tracking-[0.2em] uppercase text-warm border-b border-warm/20">
                      {t("cookies.colKey")}
                    </th>
                    <th className="px-3 py-3 text-start text-[11px] font-display tracking-[0.2em] uppercase text-warm border-b border-warm/20">
                      {t("cookies.colPurpose")}
                    </th>
                    <th className="px-3 py-3 text-start text-[11px] font-display tracking-[0.2em] uppercase text-warm border-b border-warm/20 whitespace-nowrap">
                      {t("cookies.colCategory")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr
                      key={row.keyName}
                      className="border-b border-[#323D50]/5 dark:border-white/5 last:border-0"
                    >
                      <td className="px-3 py-3 align-top font-mono text-[13px] text-[#1E2A3D] dark:text-[#F5F5F5] whitespace-nowrap">
                        {row.keyName}
                      </td>
                      <td className="px-3 py-3 align-top leading-relaxed text-[#323D50] dark:text-white/80">
                        {t(`cookies.${row.purposeKey}`)}
                      </td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        <span
                          className={
                            row.category === "catEssential"
                              ? "inline-flex text-[11px] font-semibold tracking-wider uppercase px-2 py-1 rounded-full bg-warm/15 text-warm"
                              : "inline-flex text-[11px] font-semibold tracking-wider uppercase px-2 py-1 rounded-full bg-[#5B8DD9]/15 text-[#3E6BB5] dark:text-[#7FA8E0]"
                          }
                        >
                          {t(`cookies.${row.category}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>{t("cookies.noAnalytics.heading")}</h2>
            <p>{t("cookies.noAnalytics.body")}</p>
          </section>

          <section>
            <h2>{t("cookies.managing.heading")}</h2>
            <p>{t("cookies.managing.body")}</p>
          </section>
        </article>
      </div>
    </div>
  );
}
