/**
 * ===================================================================
 * صفحة التقييمات المجمّعة (Reviews) — المسار: /reviews
 * -------------------------------------------------------------------
 * تعرض أحدث تقييمات العملاء المعتمدة (approved) عبر كل العطور (حتى ٥٠
 * تقييمًا) بترتيب زمني تنازلي. تجلب البيانات مباشرةً من جدول reviews في
 * Supabase مع اسم العطر المرتبط، وتُخفي بريد المستخدم جزئيًا للخصوصية.
 * تدعم العربية والإنجليزية.
 * ===================================================================
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Star, ArrowRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { anonymizeEmail, formatReviewDate } from "@/lib/reviewUtils";

// شكل التقييم بعد دمجه مع اسم العطر المرتبط (للعرض في الواجهة)
interface AggregateReview {
  id: string;
  perfume_id: string;
  perfume_name: string;
  perfume_name_ar: string | null;
  rating: number;
  comment: string;
  user_email: string;
  created_at: string;
}

/**
 * المكوّن الرئيسي لصفحة التقييمات المجمّعة.
 * يجلب التقييمات المعتمدة عند التحميل ويعرضها كبطاقات، مع حالات
 * التحميل والفراغ.
 */
export default function ReviewsPage() {
  const { t, language } = useLanguage();
  const reduce = useReducedMotion();
  const [reviews, setReviews] = useState<AggregateReview[]>([]);
  const [loading, setLoading] = useState(true);

  // أثر جانبي يعمل مرة واحدة عند التحميل: جلب أحدث التقييمات المعتمدة
  // مع بيانات العطر المرتبط، ثم تحويلها إلى الشكل المسطّح AggregateReview
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, perfume_id, rating, comment, user_email, created_at, perfumes(name, name_ar)")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setReviews(
          data.map((r) => {
            // العلاقة المضمّنة perfumes تأتي ككائن واحد؛ نطبّعها بأمان
            const perfume = r.perfumes as unknown as
              | { name: string; name_ar: string | null }
              | null;
            return {
              id: r.id as string,
              perfume_id: r.perfume_id as string,
              perfume_name: perfume?.name ?? "",
              perfume_name_ar: perfume?.name_ar ?? null,
              rating: r.rating as number,
              comment: r.comment as string,
              user_email: r.user_email as string,
              created_at: r.created_at as string,
            };
          }),
        );
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] pt-24 md:pt-28 pb-16 sm:pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.header
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-10"
        >
          <p className="font-display text-xs tracking-[0.3em] uppercase text-warm">
            {t("reviewsPage.eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-[#323D50] dark:text-[#F5F5F5]">
            {t("reviewsPage.title")}
          </h1>
          <p className="mt-5 text-base md:text-lg text-[#6B7B8D] dark:text-white/70 leading-relaxed max-w-2xl">
            {t("reviewsPage.lede")}
          </p>
        </motion.header>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-card rounded-2xl p-6 animate-pulse h-48"
              />
            ))}
          </div>
        )}

        {!loading && reviews.length === 0 && (
          <div className="glass-card rounded-3xl p-10 md:p-14 text-center">
            <p className="text-lg md:text-xl text-[#323D50] dark:text-[#F5F5F5] leading-relaxed">
              {t("reviewsPage.empty")}
            </p>
            <Link
              to="/collection"
              className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white text-sm font-semibold glow-warm-hover"
            >
              {t("reviewsPage.emptyCta")}
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        )}

        {!loading && reviews.length > 0 && (
          <>
            <p className="text-xs tracking-[0.2em] uppercase text-[#6B7B8D] mb-5">
              {t("reviewsPage.showingCount").replace("{count}", String(reviews.length))}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {reviews.map((r) => {
                // اختيار اسم العطر حسب اللغة: العربي إن توفّر، وإلا الإنجليزي
                const productName =
                  language === "ar" && r.perfume_name_ar
                    ? r.perfume_name_ar
                    : r.perfume_name;
                return (
                  <article
                    key={r.id}
                    className="glass-card rounded-2xl p-6 flex flex-col"
                  >
                    <div className="flex items-center gap-1.5 mb-3">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`w-4 h-4 ${
                            n <= r.rating
                              ? "fill-warm text-warm"
                              : "text-[#6B7B8D]/30"
                          }`}
                          aria-hidden
                        />
                      ))}
                    </div>
                    <p className="text-[15px] leading-relaxed text-[#1E2A3D] dark:text-[#F5F5F5]/90 flex-1">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                    <div className="mt-5 pt-4 border-t border-[#323D50]/10 dark:border-white/10 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-[#6B7B8D] dark:text-white/60 mb-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-warm" aria-hidden />
                          {/* إخفاء جزء من البريد حفاظًا على خصوصية صاحب التقييم */}
                          <span className="font-mono">{anonymizeEmail(r.user_email)}</span>
                          <span>·</span>
                          <span>{formatReviewDate(r.created_at, language)}</span>
                        </div>
                        <Link
                          to={`/product/${r.perfume_id}`}
                          className="text-sm font-medium text-[#3E6BB5] dark:text-[#7FA8E0] hover:text-warm transition-colors inline-flex items-center gap-1 group"
                        >
                          {t("reviewsPage.onProduct")} {productName}
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
