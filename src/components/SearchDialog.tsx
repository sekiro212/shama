import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Search, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSearch } from "@/hooks/useSearch";
import { useLanguage } from "@/contexts/LanguageContext";
import { SmartSearchResult } from "@/services/aiService";
import { Product } from "@/services/productsService";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { query, setQuery, results, aiResults, isSearching, isAiSearching, reset } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) reset();
    else setTimeout(() => inputRef.current?.focus(), 50);
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

  const hasResults = results.length > 0 || aiResults.length > 0;
  const showEmpty = query && !hasResults && !isSearching && !isAiSearching;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden rounded-2xl border border-[#323D50]/10 dark:border-white/10 shadow-2xl bg-white dark:bg-[#1a2235]">

        {/* Search input */}
        <div className={`flex items-center gap-3 px-4 py-3.5 border-b border-[#323D50]/10 dark:border-white/10 ${isRTL ? "flex-row-reverse" : ""}`}>
          <Search className="w-4 h-4 text-[#5B8DD9] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            dir={isRTL ? "rtl" : "ltr"}
            className="flex-1 bg-transparent text-sm text-[#323D50] dark:text-white placeholder:text-[#6B7B8D]/60 dark:placeholder:text-white/30 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="flex-shrink-0 p-1 rounded-full hover:bg-[#323D50]/10 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#6B7B8D] dark:text-white/40" />
            </button>
          )}
        </div>

        {/* Results area */}
        <div className="overflow-y-auto max-h-[420px]">
          <AnimatePresence mode="wait">

            {/* Empty / prompt state */}
            {!query && (
              <motion.div
                key="prompt"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="py-12 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-[#5B8DD9]/10 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-5 h-5 text-[#5B8DD9]" />
                </div>
                <p className="text-sm text-[#6B7B8D] dark:text-white/40">{t("search.startTyping")}</p>
                <p className="text-xs text-[#6B7B8D]/50 dark:text-white/20 mt-1">{t("search.tryHint")}</p>
              </motion.div>
            )}

            {/* No results */}
            {showEmpty && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="py-12 text-center"
              >
                <p className="text-sm text-[#6B7B8D] dark:text-white/40">
                  {t("search.noResults")} &ldquo;{query}&rdquo;
                </p>
              </motion.div>
            )}

            {/* Results */}
            {hasResults && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                {/* Text results */}
                {results.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7B8D]/60 dark:text-white/30">
                        {t("search.searchResults")}
                      </span>
                    </div>
                    {results.map((product: Product, i) => (
                      <motion.button
                        key={product.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => handleSelect(product.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#5B8DD9]/5 dark:hover:bg-white/5 transition-colors group ${isRTL ? "flex-row-reverse text-right" : ""}`}
                      >
                        {/* Image */}
                        <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-[#323D50]/5 dark:bg-white/5">
                          <img
                            src={product.images?.[0]?.image_url || ""}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#323D50] dark:text-white truncate">{product.name}</p>
                          <p className="text-xs text-[#6B7B8D] dark:text-white/40">
                            {product.price} LYD · {product.gender || "unisex"} · {product.size}
                          </p>
                        </div>
                        {/* Right side */}
                        <div className={`flex items-center gap-2 flex-shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
                          {product.stock_quantity === 0 && (
                            <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                              {t("search.soldOut")}
                            </span>
                          )}
                          <ChevronRight className={`w-3.5 h-3.5 text-[#6B7B8D]/30 dark:text-white/20 group-hover:text-[#5B8DD9] transition-colors ${isRTL ? "rotate-180" : ""}`} />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Divider */}
                {results.length > 0 && aiResults.length > 0 && (
                  <div className="mx-4 my-1 border-t border-[#323D50]/5 dark:border-white/5" />
                )}

                {/* AI results */}
                {aiResults.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#5B8DD9]" />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#5B8DD9]/70">
                        {t("search.aiRecommendations")}
                      </span>
                    </div>
                    {aiResults.map((result: SmartSearchResult, i) => (
                      <motion.button
                        key={result.product.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => handleSelect(result.product.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-[#5B8DD9]/5 dark:hover:bg-[#5B8DD9]/10 transition-colors group ${isRTL ? "flex-row-reverse text-right" : ""}`}
                      >
                        {/* Image with blue border */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-[#5B8DD9]/30">
                          <img
                            src={result.product.images?.[0]?.image_url || ""}
                            alt={result.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className={`flex items-center gap-2 mb-0.5 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
                            <p className="text-sm font-medium text-[#323D50] dark:text-white truncate">{result.product.name}</p>
                            <span className="text-[10px] font-semibold text-[#5B8DD9] bg-[#5B8DD9]/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              {result.matchScore}% {t("aiFinder.match")}
                            </span>
                          </div>
                          {result.reason && (
                            <p className="text-xs text-[#6B7B8D] dark:text-white/40 italic line-clamp-2 mb-0.5">{result.reason}</p>
                          )}
                          <p className="text-xs text-[#6B7B8D]/70 dark:text-white/30">
                            {result.product.price} LYD · {result.product.gender || "unisex"}
                          </p>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 text-[#6B7B8D]/30 dark:text-white/20 group-hover:text-[#5B8DD9] transition-colors mt-1 flex-shrink-0 ${isRTL ? "rotate-180" : ""}`} />
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>

          {/* AI searching indicator */}
          <AnimatePresence>
            {isAiSearching && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-3 border-t border-[#5B8DD9]/10 dark:border-[#5B8DD9]/20 bg-[#5B8DD9]/5 dark:bg-[#5B8DD9]/10"
              >
                <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse justify-end" : ""}`}>
                  <Sparkles className="w-3.5 h-3.5 text-[#5B8DD9] animate-pulse flex-shrink-0" />
                  <span className="text-xs text-[#5B8DD9] font-medium">{t("search.aiSearching")}</span>
                  <span className={`inline-flex gap-0.5 ${isRTL ? "mr-auto" : "ml-auto"}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B8DD9] animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B8DD9] animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B8DD9] animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={`px-4 py-2.5 border-t border-[#323D50]/5 dark:border-white/5 flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
          <span className="text-[10px] text-[#6B7B8D]/50 dark:text-white/20">
            {results.length + aiResults.length} {t("search.results")}
          </span>
          <span className="text-[10px] text-[#6B7B8D]/50 dark:text-white/20 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[#323D50]/5 dark:bg-white/5 rounded text-[10px]">Esc</kbd>
            {t("search.escToClose")}
          </span>
        </div>

      </DialogContent>
    </Dialog>
  );
}
