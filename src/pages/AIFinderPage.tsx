import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { smartSearch, SmartSearchResult } from "@/services/aiService";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";
import MatchBadge from "@/components/MatchBadge";

export default function AIFinderPage() {
  const { t, isRTL } = useLanguage();
  const [searchParams] = useSearchParams();
  const reduce = useReducedMotion();

  const CHIPS = [
    { label: t("home.chipNightOut"), query: "a seductive perfume for a night out" },
    { label: t("home.chipEveryday"), query: "a light fresh everyday perfume" },
    { label: t("home.chipGiftForHer"), query: "a romantic floral gift for her" },
    { label: t("home.chipWoody"), query: "woody warm oriental perfume" },
    { label: t("home.chipSummer"), query: "a bright citrus perfume for summer" },
    { label: t("home.chipOffice"), query: "a clean subtle perfume for office wear" },
    { label: t("home.chipWinter"), query: "a rich spicy warm perfume for winter" },
  ];

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SmartSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(q?: string) {
    const searchQuery = (q ?? query).trim();
    if (!searchQuery) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await smartSearch(searchQuery);
      setResults(res);
    } catch {
      setResults([]);
      toast.error(t("aiFinder.searchFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      handleSearch(q);
    }
  }, []);

  function handleChipClick(chipQuery: string) {
    setQuery(chipQuery);
    handleSearch(chipQuery);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  }

  const sortedResults = [...results].sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div
      className={`min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] text-[#323D50] dark:text-[#F5F5F5] ${isRTL ? "rtl" : "ltr"}`}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-8 sm:py-12 pt-24 md:pt-28 pb-16 sm:pb-24">
        {/* Hero Section — editorial candlelight */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-10"
        >
          <motion.div
            animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
            transition={reduce ? undefined : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-warm/15 border border-warm/30 mb-5 glow-warm"
          >
            <Sparkles className="w-7 h-7 text-warm" />
          </motion.div>

          <p className="font-display text-[11px] tracking-[0.3em] uppercase text-warm mb-3">
            AI Finder
          </p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#1E2A3D] dark:text-[#F5F5F5] leading-[1.05] mb-3">
            {t("aiFinder.title")}
          </h1>
          <p className="text-[#6B7B8D] dark:text-[#F5F5F5]/60 text-sm sm:text-base md:text-lg max-w-xl mx-auto px-2 leading-relaxed">
            {t("aiFinder.subtitle")}
          </p>
        </motion.div>

        {/* Input Area */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="glass-card p-4 sm:p-6 rounded-2xl mb-8 max-w-3xl mx-auto"
        >
          <textarea
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("aiFinder.placeholder")}
            aria-label={t("aiFinder.title")}
            className="w-full p-3 sm:p-4 rounded-2xl border-2 border-warm/25 bg-white dark:bg-[#1a2235] text-[#323D50] dark:text-[#F5F5F5] text-base resize-none focus:border-warm focus:outline-none focus:ring-2 focus:ring-warm/20 transition-all"
            dir={isRTL ? "rtl" : "ltr"}
          />

          {/* Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 mt-4 scrollbar-hide -mx-1 px-1">
            {CHIPS.map((chip, i) => (
              <motion.button
                key={chip.query}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                onClick={() => handleChipClick(chip.query)}
                className="px-3.5 py-2 min-h-[40px] rounded-full text-xs sm:text-sm border border-warm/30 hover:border-warm/60 hover:bg-warm/10 hover:text-warm cursor-pointer transition-all whitespace-nowrap flex-shrink-0 text-[#323D50] dark:text-[#F5F5F5]"
              >
                {chip.label}
              </motion.button>
            ))}
          </div>

          {/* Search Button */}
          <button
            onClick={() => handleSearch()}
            disabled={isLoading || !query.trim()}
            className="w-full mt-4 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white py-3 min-h-[48px] rounded-2xl font-semibold text-base sm:text-lg glow-warm-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {t("aiFinder.analyzing")}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {t("aiFinder.findButton")}
              </>
            )}
          </button>
        </motion.div>

        {/* Loading skeletons */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              key="skeletons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-center font-display text-xs tracking-[0.28em] uppercase text-warm mb-5 inline-flex items-center gap-2 justify-center w-full">
                <Sparkles className={`w-3.5 h-3.5 ${reduce ? "" : "animate-pulse"}`} />
                {t("aiFinder.findingMatches")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl overflow-hidden">
                    <Skeleton className="w-full aspect-[4/5]" />
                    <div className="p-5 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Grid — reuses ProductCard, augmented with MatchBadge */}
        <AnimatePresence>
          {!isLoading && sortedResults.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="font-display text-xs tracking-[0.28em] uppercase text-warm mb-5 text-center tabular-nums">
                {sortedResults.length} {t("aiFinder.matchesFound")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {sortedResults.map((result, index) => (
                  <motion.div
                    key={result.product.id}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="relative"
                  >
                    <ProductCard product={result.product} />
                    <MatchBadge
                      score={result.matchScore}
                      reason={result.reason}
                      matchLabel={t("aiFinder.match")}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!isLoading && results.length === 0 && hasSearched && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-warm/15 border border-warm/30 mb-4">
              <Sparkles className="w-6 h-6 text-warm" />
            </div>
            <p className="font-display text-xl text-[#1E2A3D] dark:text-[#F5F5F5] mb-2">
              {t("aiFinder.noMatches")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
