/**
 * ============================================================================
 * صفحة "تواصل معنا" (Contact) — المسار: /contact
 * ----------------------------------------------------------------------------
 * صفحة شبه ثابتة تعرض قنوات التواصل عبر مواقع التواصل الاجتماعي إضافةً إلى
 * تفاصيل الحساب البنكي للتحويل (BANK_DETAILS مستوردة من ملف orderUtils).
 * الميزة التفاعلية الوحيدة: زر نسخ بيانات الحساب إلى الحافظة (clipboard).
 * النصوص ثنائية اللغة (عربي/إنجليزي) عبر دالة الترجمة t().
 * ============================================================================
 */
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Copy, Check, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { BANK_DETAILS } from "@/lib/orderUtils";

// أيقونات SVG مخصّصة لمنصّات التواصل (غير متوفّرة ضمن مكتبة lucide-react)
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385h-3.047v-3.47h3.047v-2.642c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385c5.738-.9 10.126-5.864 10.126-11.854z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

// قائمة قنوات التواصل الاجتماعي: لكل قناة مفتاح ترجمة، ورابط، ومكوّن أيقونتها
const CHANNELS = [
  {
    key: "instagram",
    href: "https://www.instagram.com/shama._200/?igsh=dDcyZmc3ODByNHBl&utm_source=qr",
    Icon: InstagramIcon,
  },
  {
    key: "facebook",
    href: "https://www.facebook.com/profile.php?id=61575028689348",
    Icon: FacebookIcon,
  },
  {
    key: "tiktok",
    href: "https://www.tiktok.com/@shama_625",
    Icon: TikTokIcon,
  },
] as const;

/**
 * المكوّن الرئيسي لصفحة "تواصل معنا".
 * - copied: يخزّن مفتاح الحقل الذي تم نسخه مؤخّرًا لإظهار علامة "تم النسخ".
 */
export default function ContactPage() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState<string | null>(null);

  // نسخ قيمة (رقم حساب / IBAN) إلى حافظة النظام مع إظهار إشعار نجاح أو خطأ
  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      toast.success(t("contact.bank.copied"));
      // إعادة الزر إلى حالته الأصلية بعد ١.٥ ثانية
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error(t("common.error"));
    }
  };

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
            {t("contact.eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-[#323D50] dark:text-[#F5F5F5]">
            {t("contact.title")}
          </h1>
          <p className="mt-5 text-base md:text-lg text-[#6B7B8D] dark:text-white/70 leading-relaxed max-w-2xl">
            {t("contact.lede")}
          </p>
        </motion.header>

        {/* Social channels */}
        <section className="mb-10">
          <p className="font-display text-xs tracking-[0.22em] uppercase text-warm mb-4">
            {t("contact.channels.heading")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CHANNELS.map(({ key, href, Icon }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group glass-card rounded-2xl p-5 border border-transparent hover:border-warm/40 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-warm/15 text-warm group-hover:bg-warm/25 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#6B7B8D] group-hover:text-warm transition-colors" aria-hidden />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-[#1E2A3D] dark:text-[#F5F5F5]">
                  {t(`contact.${key}.label`)}
                </h3>
                <p className="mt-1 text-sm text-[#3E6BB5] dark:text-[#7FA8E0]">
                  {t(`contact.${key}.handle`)}
                </p>
                <p className="mt-2 text-xs text-[#6B7B8D] dark:text-white/60 leading-relaxed">
                  {t(`contact.${key}.description`)}
                </p>
              </a>
            ))}
          </div>
        </section>

        {/* قسم التحويل البنكي: يعرض بيانات الحساب مع زر نسخ بجانب كل حقل */}
        <section className="glass-card rounded-3xl p-6 md:p-8">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
            <h2 className="font-display text-xl md:text-2xl font-semibold text-[#1E2A3D] dark:text-[#F5F5F5]">
              {t("contact.bank.heading")}
            </h2>
          </div>
          <p className="text-sm text-[#6B7B8D] dark:text-white/70 mb-6 leading-relaxed">
            {t("contact.bank.sub")}
          </p>

          <dl className="divide-y divide-[#323D50]/10 dark:divide-white/10">
            {[
              { label: "holder", value: BANK_DETAILS.accountHolder },
              { label: "account", value: BANK_DETAILS.accountNumber },
              { label: "iban", value: BANK_DETAILS.iban },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] font-display tracking-[0.22em] uppercase text-warm">
                    {t(`contact.bank.${label}`)}
                  </dt>
                  <dd className="mt-1 font-mono text-sm text-[#1E2A3D] dark:text-[#F5F5F5] truncate">
                    {value}
                  </dd>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(value, label)}
                  aria-label={t("contact.bank.copy")}
                  className="shrink-0 inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg bg-[#323D50]/5 dark:bg-white/10 text-xs font-medium text-[#1E2A3D] dark:text-white/85 hover:bg-warm/15 hover:text-warm transition-colors"
                >
                  {copied === label ? (
                    <>
                      <Check className="w-3.5 h-3.5" aria-hidden />
                      {t("contact.bank.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden />
                      {t("contact.bank.copy")}
                    </>
                  )}
                </button>
              </div>
            ))}
          </dl>
        </section>

        <p className="mt-10 text-center text-sm text-[#6B7B8D] dark:text-white/60">
          {t("contact.response")}
        </p>
      </div>
    </div>
  );
}
