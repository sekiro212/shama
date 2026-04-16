import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Sparkles, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { smartSearch, SmartSearchResult } from "@/services/aiService";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function ResultCard({
  result,
  index,
}: {
  result: SmartSearchResult;
  index: number;
}) {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  const scoreColor =
    result.matchScore >= 80
      ? "text-green-600 bg-green-50 dark:bg-green-950/30"
      : result.matchScore >= 60
        ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30"
        : "text-muted-foreground bg-muted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
      onClick={() => navigate(`/product/${result.product.id}`)}
    >
      <div className="relative">
        <img
          src={result.product.images?.[0]?.image_url ?? "/placeholder.png"}
          alt={result.product.name}
          className="w-full h-44 sm:h-40 object-cover"
        />
        <span
          className={`absolute top-2 ${isRTL ? "left-2" : "right-2"} text-[11px] sm:text-xs font-semibold px-2 py-1 rounded-full ${scoreColor}`}
        >
          {result.matchScore}% {t("aiFinder.match")}
        </span>
      </div>
      <div className="p-3 sm:p-3">
        <h3 className="font-semibold text-sm truncate">{result.product.name}</h3>
        {result.reason && (
          <p className="text-xs text-muted-foreground italic line-clamp-3 mt-1">
            {result.reason}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
          <span className="font-bold text-[#5B8DD9] text-sm">
            {result.product.price} LYD
          </span>
          <button className="text-xs text-[#5B8DD9] flex items-center gap-0.5 hover:gap-1.5 transition-all whitespace-nowrap">
            {t("aiFinder.viewPerfume")}{" "}
            <ChevronRight
              className={`w-3 h-3 ${isRTL ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function AIFinderPage() {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  return (
    <div
      className={`min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] text-[#323D50] dark:text-[#F5F5F5] ${isRTL ? "rtl" : "ltr"}`}
    >
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-8 sm:py-12 pt-20 sm:pt-24">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6 sm:mb-10"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#5B8DD9]/10 mb-4 sm:mb-5"
          >
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-[#5B8DD9]" />
          </motion.div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-3 bg-gradient-to-r from-[#5B8DD9] via-[#8ab4f8] to-[#3E6BB5] bg-clip-text text-transparent animate-pulse leading-tight">
            {t("aiFinder.title")}
          </h1>
          <p className="text-[#6B7B8D] dark:text-[#F5F5F5]/60 text-sm sm:text-base md:text-lg max-w-xl mx-auto px-2">
            {t("aiFinder.subtitle")}
          </p>
        </motion.div>

        {/* Input Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass-card p-4 sm:p-6 rounded-2xl mb-6"
        >
          <textarea
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("aiFinder.placeholder")}
            className="w-full p-3 sm:p-4 rounded-2xl border-2 border-[#5B8DD9]/30 bg-white dark:bg-[#1a2235] text-[#323D50] dark:text-[#F5F5F5] text-base resize-none focus:border-[#5B8DD9] focus:outline-none transition-colors"
            dir={isRTL ? "rtl" : "ltr"}
          />

          {/* Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 mt-3 sm:mt-4 scrollbar-hide -mx-1 px-1">
            {CHIPS.map((chip, i) => (
              <motion.button
                key={chip.query}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
                onClick={() => handleChipClick(chip.query)}
                className="px-3 py-2 min-h-[40px] rounded-full text-xs sm:text-sm border border-[#5B8DD9]/40 hover:border-[#5B8DD9] hover:bg-[#5B8DD9]/10 cursor-pointer transition-all whitespace-nowrap flex-shrink-0 text-[#323D50] dark:text-[#F5F5F5]"
              >
                {chip.label}
              </motion.button>
            ))}
          </div>

          {/* Search Button */}
          <button
            onClick={() => handleSearch()}
            disabled={isLoading || !query.trim()}
            className="w-full mt-3 sm:mt-4 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white py-3 min-h-[48px] rounded-2xl font-semibold text-base sm:text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
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
              <p className="text-center text-sm text-[#5B8DD9] mb-4 animate-pulse">
                ✨ {t("aiFinder.findingMatches")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl overflow-hidden">
                    <Skeleton className="w-full h-40" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Grid */}
        <AnimatePresence>
          {!isLoading && results.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm text-[#6B7B8D] dark:text-[#F5F5F5]/50 mb-4">
                {results.length} {t("aiFinder.matchesFound")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {results.map((result, index) => (
                  <ResultCard key={result.product.id} result={result} index={index} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!isLoading && results.length === 0 && hasSearched && (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t("aiFinder.noMatches")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
