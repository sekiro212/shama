import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Search, X, ArrowRight, TrendingUp } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSearch } from "@/hooks/useSearch";
import { useLanguage } from "@/contexts/LanguageContext";
import { SmartSearchResult } from "@/services/aiService";
import { Product } from "@/services/productsService";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_SEARCHES = [
  { label: "Night out", query: "seductive perfume for night" },
  { label: "Woody & warm", query: "woody warm perfume" },
  { label: "Gift for her", query: "gift perfume for women" },
  { label: "Summer fresh", query: "light fresh summer perfume" },
  { label: "Under 300 LYD", query: "perfume under 300 lyd" },
];

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { query, setQuery, results, aiResults, isSearching, isAiSearching, reset } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) {
      reset();
    } else {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, reset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = (productId: string) => {
    onOpenChange(false);
    navigate(`/product/${productId}`);
  };

  const handleQuickSearch = (q: string) => {
    setQuery(q);
    inputRef.current?.focus();
  };

  const hasResults = results.length > 0 || aiResults.length > 0;
  const showEmpty = query.trim() && !hasResults && !isSearching && !isAiSearching;
  const totalCount = results.length + aiResults.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-2xl w-[95vw] sm:w-[95vw] max-h-[85vh] overflow-hidden rounded-2xl sm:rounded-3xl border-0 shadow-[0_32px_80px_rgba(0,0,0,0.25)] bg-white/95 dark:bg-[#0f1521]/95 backdrop-blur-2xl">

        {/* ── Input bar ── */}
        <div className={`relative flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-warm/15 dark:border-warm/10 ${isRTL ? "flex-row-reverse" : ""}`}>
          <Search className="w-5 h-5 text-warm flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            dir={isRTL ? "rtl" : "ltr"}
            aria-label={t("search.placeholder")}
            className="flex-1 bg-transparent text-base font-medium text-[#1a1a2e] dark:text-white placeholder:text-[#9ca3af] dark:placeholder:text-white/30 outline-none"
          />
          <div className={`flex items-center gap-2 flex-shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
            {(isSearching) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="w-4 h-4 rounded-full border-2 border-warm/30 border-t-warm animate-spin"
              />
            )}
            {query && (
              <button
                onClick={() => setQuery("")}
                className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3 text-[#6B7B8D] dark:text-white/50" />
              </button>
            )}
          </div>
        </div>

        {/* ── Scrollable results ── */}
        <div className="overflow-y-auto max-h-[60vh] sm:max-h-[62vh]">
          <AnimatePresence mode="wait" initial={false}>

            {/* Empty state: quick searches */}
            {!query && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="px-5 py-6"
              >
                <div className={`flex items-center gap-2 mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <TrendingUp className="w-3.5 h-3.5 text-warm" />
                  <span className="font-display text-[11px] tracking-[0.22em] uppercase text-warm">
                    Popular Searches
                  </span>
                </div>
                <div className={`flex flex-wrap gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                  {QUICK_SEARCHES.map((s) => (
                    <button
                      key={s.query}
                      onClick={() => handleQuickSearch(s.query)}
                      className="px-3.5 py-1.5 text-sm rounded-full border border-black/8 dark:border-white/10 text-[#4b5563] dark:text-white/60 hover:border-warm/50 hover:text-warm hover:bg-warm/5 transition-all duration-200 cursor-pointer"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* No results */}
            {showEmpty && (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="py-14 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-black/4 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-[#9ca3af] dark:text-white/25" />
                </div>
                <p className="text-sm font-medium text-[#6b7280] dark:text-white/40">
                  {t("search.noResults")} &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-[#9ca3af] dark:text-white/25 mt-1">
                  Try a different scent, occasion, or mood
                </p>
              </motion.div>
            )}

            {/* Results */}
            {hasResults && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >

                {/* Text results */}
                {results.length > 0 && (
                  <div className="pt-3 pb-2">
                    <div className={`px-5 pb-2 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <span className="font-display text-[10px] font-semibold tracking-[0.22em] uppercase text-warm">
                        {t("search.searchResults")}
                      </span>
                      <span className="font-display text-[10px] text-warm/50 tabular-nums">
                        {results.length}
                      </span>
                    </div>
                    {results.map((product: Product, i) => (
                      <TextResultRow
                        key={product.id}
                        product={product}
                        index={i}
                        isRTL={isRTL}
                        soldOutLabel={t("search.soldOut")}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                )}

                {/* Divider */}
                {results.length > 0 && aiResults.length > 0 && (
                  <div className="mx-5 my-1 h-px bg-black/5 dark:bg-white/5" />
                )}

                {/* AI results */}
                {aiResults.length > 0 && (
                  <div className="pt-3 pb-2">
                    {/* Amber AI header */}
                    <div className={`px-5 pb-2 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warm/15 border border-warm/30">
                        <Sparkles className="w-3 h-3 text-warm" />
                        <span className="font-display text-[10px] font-semibold tracking-[0.22em] uppercase text-warm">
                          {t("search.aiRecommendations")}
                        </span>
                      </div>
                    </div>
                    {aiResults.map((result: SmartSearchResult, i) => (
                      <AIResultRow
                        key={result.product.id}
                        result={result}
                        index={i}
                        isRTL={isRTL}
                        matchLabel={t("aiFinder.match")}
                        soldOutLabel={t("search.soldOut")}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                )}

              </motion.div>
            )}

          </AnimatePresence>

          {/* AI searching banner */}
          <AnimatePresence>
            {isAiSearching && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className={`mx-4 mb-3 px-4 py-3 rounded-2xl bg-warm/10 dark:bg-warm/15 border border-warm/30 flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <Sparkles className={`w-4 h-4 text-warm flex-shrink-0 ${reduce ? "" : "animate-pulse"}`} />
                  <span className="font-display text-xs tracking-wide font-medium text-warm">{t("search.aiSearching")}</span>
                  <div className={`flex gap-1 ${isRTL ? "mr-auto" : "ml-auto"}`}>
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className={`w-1.5 h-1.5 rounded-full bg-warm ${reduce ? "" : "animate-bounce"}`}
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className={`px-4 sm:px-5 py-3 border-t border-warm/10 flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
          <span className="font-display text-[11px] tracking-[0.18em] text-warm/70 tabular-nums">
            {query ? `${totalCount} ${t("search.results")}` : (
              <span className="hidden sm:inline-flex items-center gap-1.5">
                <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-warm/10 rounded-md border border-warm/25 text-warm">
                  ⌘K
                </kbd>
              </span>
            )}
          </span>
          <div className={`hidden sm:flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <span className="text-[11px] text-[#9ca3af] dark:text-white/30 flex items-center gap-1.5">
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-warm/10 rounded-md border border-warm/25 text-warm">
                Esc
              </kbd>
              {t("search.escToClose")}
            </span>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

/* ── Sub-components ── */

function TextResultRow({
  product, index, isRTL, soldOutLabel, onSelect,
}: {
  product: Product;
  index: number;
  isRTL: boolean;
  soldOutLabel: string;
  onSelect: (id: string) => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.2 }}
      onClick={() => onSelect(product.id)}
      className={`w-full flex items-center gap-3.5 px-5 py-2.5 hover:bg-warm/5 dark:hover:bg-warm/8 transition-colors duration-150 group cursor-pointer ${isRTL ? "flex-row-reverse text-right" : ""}`}
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-black/4 dark:bg-white/5 shadow-sm ring-1 ring-transparent group-hover:ring-warm/40 transition-colors">
        <img
          src={product.images?.[0]?.image_url || ""}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-semibold text-[#1a1a2e] dark:text-white truncate leading-snug">
          {product.name}
        </p>
        <p className="text-xs text-[#9ca3af] dark:text-white/35 mt-0.5">
          {product.price} LYD · {product.gender || "unisex"} · {product.size}
        </p>
      </div>
      <div className={`flex items-center gap-2 flex-shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
        {product.stock_quantity === 0 && (
          <span className="text-[10px] font-medium text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">
            {soldOutLabel}
          </span>
        )}
        <ArrowRight className={`w-4 h-4 text-[#d1d5db] dark:text-white/15 group-hover:text-warm group-hover:translate-x-0.5 transition-all duration-200 ${isRTL ? "rotate-180 group-hover:-translate-x-0.5 group-hover:translate-x-0" : ""}`} />
      </div>
    </motion.button>
  );
}

function AIResultRow({
  result, index, isRTL, matchLabel, soldOutLabel, onSelect,
}: {
  result: SmartSearchResult;
  index: number;
  isRTL: boolean;
  matchLabel: string;
  soldOutLabel: string;
  onSelect: (id: string) => void;
}) {
  const scoreColor =
    result.matchScore >= 85
      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400"
      : "text-warm bg-warm/15 border border-warm/30";

  return (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.22 }}
      onClick={() => onSelect(result.product.id)}
      className={`w-full flex items-start gap-3.5 px-5 py-3 hover:bg-warm/8 dark:hover:bg-warm/10 transition-colors duration-150 group cursor-pointer ${isRTL ? "flex-row-reverse text-right" : ""}`}
    >
      {/* Image with amber ring */}
      <div className="w-13 h-13 rounded-xl overflow-hidden flex-shrink-0 ring-1.5 ring-warm/60 shadow-sm" style={{ width: 52, height: 52 }}>
        <img
          src={result.product.images?.[0]?.image_url || ""}
          alt={result.product.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className={`flex items-start justify-between gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <p className="font-display text-sm font-semibold text-[#1a1a2e] dark:text-white truncate leading-snug flex-1">
            {result.product.name}
          </p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${scoreColor}`}>
            {result.matchScore}% {matchLabel}
          </span>
        </div>
        {result.reason && (
          <p className="text-xs text-[#6b7280] dark:text-white/40 italic mt-1 line-clamp-2 leading-relaxed">
            {result.reason}
          </p>
        )}
        <p className="text-xs text-[#9ca3af] dark:text-white/30 mt-1">
          {result.product.price} LYD · {result.product.gender || "unisex"}
        </p>
      </div>

      {/* Arrow */}
      <div className={`flex items-center gap-2 flex-shrink-0 mt-0.5 ${isRTL ? "flex-row-reverse" : ""}`}>
        {result.product.stock_quantity === 0 && (
          <span className="text-[10px] font-medium text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">
            {soldOutLabel}
          </span>
        )}
        <ArrowRight className={`w-4 h-4 text-warm/40 group-hover:text-warm group-hover:translate-x-0.5 transition-all duration-200 ${isRTL ? "rotate-180 group-hover:-translate-x-0.5 group-hover:translate-x-0" : ""}`} />
      </div>
    </motion.button>
  );
}
