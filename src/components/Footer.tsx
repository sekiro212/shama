/**
 * ===============================================================
 * Footer.tsx — تذييل الموقع (الفوتر)
 * ---------------------------------------------------------------
 * يعرض شعار العلامة التجارية، نموذج الاشتراك في النشرة البريدية،
 * روابط مواقع التواصل الاجتماعي، أعمدة روابط (المتجر/الخدمة/الشركة)،
 * وصفّ الروابط القانونية في الأسفل.
 *
 * مكان الاستخدام: يُركَّب في التخطيط الرئيسي (Layout) أسفل كل
 * صفحات الموقع العامّة.
 * يدعم الاتجاهين العربي (RTL) والإنجليزي (LTR) عبر useLanguage().
 * ===============================================================
 */
import { useState, useEffect, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Mail, ArrowRight, ChevronDown } from "lucide-react";

/**
 * خطّاف (hook) مساعد يتتبّع ما إذا كان عرض الشاشة بحجم سطح المكتب (768px فأكثر).
 * يُستخدم لتبديل سلوك أعمدة الروابط بين العرض الكامل (سطح المكتب) والطيّ
 * القابل للفتح (الجوال). يستمع لتغيّر المقاس عبر matchMedia.
 */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : true,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385h-3.047v-3.47h3.047v-2.642c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385c5.738-.9 10.126-5.864 10.126-11.854z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

type LinkItem = { label: string; href: string };

/**
 * عمود روابط واحد في الفوتر (مثل: المتجر، الخدمة، الشركة).
 * على سطح المكتب يظهر العنوان وقائمة الروابط مفتوحة دائمًا، وعلى
 * الجوال يتحوّل إلى عنصر طيّ (accordion) يُفتح ويُغلق بالضغط.
 * @param heading عنوان العمود (نصّ مُترجَم).
 * @param items مصفوفة الروابط المعروضة داخل العمود.
 */
function NavColumn({
  heading,
  items,
}: {
  heading: string;
  items: LinkItem[];
}) {
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);

  const Heading = (
    <span className="font-display text-xs tracking-[0.22em] uppercase text-warm">
      {heading}
    </span>
  );
  const List = (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            to={item.href}
            className="text-sm text-[#323D50]/80 dark:text-white/70 hover:text-[#1E2A3D] dark:hover:text-white transition-colors"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  if (isDesktop) {
    return (
      <div>
        {Heading}
        {List}
      </div>
    );
  }

  return (
    <div className="border-b border-[#323D50]/10 dark:border-white/10 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between w-full"
      >
        {Heading}
        <ChevronDown
          className={`w-4 h-4 text-[#6B7B8D] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && List}
    </div>
  );
}

/**
 * المكوّن الرئيسي لتذييل الموقع. يدير حالة نموذج الاشتراك في
 * النشرة البريدية (البريد، حالة الإرسال، حالة الاشتراك الناجح).
 */
export default function Footer() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // معالجة إرسال نموذج الاشتراك في النشرة البريدية (ملاحظة: نقطة النهاية الفعلية لم تُربَط بعد)
  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setSubmitting(true);
    try {
      // TODO: wire to newsletter endpoint (Supabase Edge Function `subscribe-newsletter`)
      await new Promise((r) => setTimeout(r, 400));
      setSubscribed(true);
      setEmail("");
      toast.success(t("footer.newsletterSuccess"));
    } catch {
      toast.error(t("common.error") || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const shopLinks: LinkItem[] = [
    { label: t("footer.columns.shopCollection"), href: "/collection" },
    { label: t("footer.columns.shopGiftSets"), href: "/gift-sets" },
    { label: t("footer.columns.shopSamples"), href: "/samples" },
    { label: t("footer.columns.shopAiFinder"), href: "/ai-finder" },
  ];

  const serviceLinks: LinkItem[] = [
    { label: t("footer.columns.serviceContact"), href: "/contact" },
    { label: t("footer.columns.serviceShipping"), href: "/shipping" },
    { label: t("footer.columns.serviceReturns"), href: "/returns" },
    { label: t("footer.columns.serviceFaq"), href: "/faq" },
  ];

  const companyLinks: LinkItem[] = [
    { label: t("footer.columns.companyStory"), href: "/about" },
    { label: t("footer.columns.companyReviews"), href: "/reviews" },
  ];

  return (
    <footer className="relative bg-[#F8F9FB] dark:bg-[#1a2235] border-t border-warm/15">
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-12">
          {/* Brand + Newsletter block — spans 2 cols on md+ */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-5 group" aria-label="Shama Perfumes home">
              <div className="w-12 h-12 glass rounded-xl overflow-hidden border border-[#323D50]/10 dark:border-white/10">
                <img src="/shama-logo.jpg" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-2xl font-semibold tracking-tight text-[#1E2A3D] dark:text-[#F5F5F5]">
                  Shama
                </span>
                <span className="font-display italic text-[11px] tracking-[0.2em] text-warm mt-1">
                  {t("header.luxuryScents")}
                </span>
              </div>
            </Link>

            <p className="text-sm text-[#6B7B8D] dark:text-white/70 max-w-sm leading-relaxed mb-6">
              {t("footer.tagline")}
            </p>

            {/* Newsletter */}
            <div className="max-w-sm">
              <h3 className="font-display text-sm tracking-[0.22em] uppercase text-warm mb-2">
                {t("footer.newsletterHeading")}
              </h3>
              <p className="text-sm text-[#6B7B8D] dark:text-white/70 mb-4 leading-relaxed">
                {t("footer.newsletterSub")}
              </p>
              <form
                onSubmit={handleSubscribe}
                aria-label={t("footer.newsletterHeading")}
                className="relative"
              >
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  {t("footer.newsletterPlaceholder")}
                </label>
                <div className="flex items-center gap-2 glass rounded-xl border border-[#323D50]/10 dark:border-white/10 focus-within:border-warm/50 focus-within:ring-2 focus-within:ring-warm/20 transition-colors pe-1.5">
                  <Mail className="w-4 h-4 ms-3 text-[#6B7B8D] dark:text-white/60" aria-hidden />
                  <input
                    id="footer-newsletter-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("footer.newsletterPlaceholder")}
                    disabled={submitting || subscribed}
                    className="flex-1 bg-transparent text-sm py-2.5 focus:outline-none placeholder:text-[#6B7B8D]/70 dark:placeholder:text-white/50 text-[#1E2A3D] dark:text-[#F5F5F5] min-w-0"
                  />
                  <button
                    type="submit"
                    disabled={submitting || subscribed}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white text-xs font-semibold px-3 py-2 rounded-lg glow-warm-hover disabled:opacity-60"
                  >
                    {subscribed ? t("footer.newsletterSuccess") : t("footer.newsletterSubmit")}
                    {!subscribed && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#6B7B8D] dark:text-white/60 mt-2 leading-relaxed">
                  {t("footer.newsletterConsent")}
                </p>
              </form>
            </div>

            {/* Social */}
            <div className="flex items-center gap-2 mt-6">
              {[
                {
                  href: "https://www.instagram.com/shama._200/?igsh=dDcyZmc3ODByNHBl&utm_source=qr",
                  label: "Instagram",
                  Icon: InstagramIcon,
                },
                {
                  href: "https://www.facebook.com/profile.php?id=61575028689348",
                  label: "Facebook",
                  Icon: FacebookIcon,
                },
                {
                  href: "https://www.tiktok.com/@shama_625",
                  label: "TikTok",
                  Icon: TikTokIcon,
                },
              ].map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex items-center justify-center w-10 h-10 rounded-full border border-[#323D50]/10 dark:border-white/15 text-[#6B7B8D] dark:text-white/70 hover:text-warm hover:border-warm/60 hover:bg-warm/5 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          <NavColumn heading={t("footer.columns.shop")} items={shopLinks} />
          <NavColumn heading={t("footer.columns.service")} items={serviceLinks} />
          <NavColumn heading={t("footer.columns.company")} items={companyLinks} />
        </div>

        {/* Legal row */}
        <div className="mt-12 pt-6 border-t border-[#323D50]/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#6B7B8D] dark:text-white/60">
            &copy; {t("footer.copyright")}
          </p>
          <nav aria-label="Legal" className="flex items-center gap-1">
            {[
              { label: t("footer.legal.privacy"), href: "/privacy" },
              { label: t("footer.legal.terms"), href: "/terms" },
              { label: t("footer.legal.cookies"), href: "/cookies" },
            ].map((item, i, arr) => (
              <span key={item.href} className="flex items-center gap-1">
                <Link
                  to={item.href}
                  className="text-xs text-[#6B7B8D] dark:text-white/60 hover:text-[#1E2A3D] dark:hover:text-white transition-colors px-2 py-1"
                >
                  {item.label}
                </Link>
                {i < arr.length - 1 && (
                  <span aria-hidden className="text-[#6B7B8D]/40 dark:text-white/30">
                    ·
                  </span>
                )}
              </span>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
