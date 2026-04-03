import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Search, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { useSearch } from "@/hooks/useSearch";
import { useLanguage } from "@/contexts/LanguageContext";
import { SmartSearchResult } from "@/services/aiService";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { query, setQuery, results, aiResults, isSearching, isAiSearching, reset } = useSearch();

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  // Global keyboard shortcut
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

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="bg-[#F8F9FB] dark:bg-[#1a2235] border border-[#323D50]/10 dark:border-white/10 rounded-xl overflow-hidden">
        <div className="flex items-center px-4 py-2 border-b border-[#323D50]/10 dark:border-white/10">
          <Search className="w-4 h-4 text-[#6B7B8D] dark:text-white/40 me-3 flex-shrink-0" />
          <CommandInput
            placeholder={t("search.placeholder")}
            value={query}
            onValueChange={setQuery}
            className="text-[#323D50] dark:text-white placeholder:text-[#6B7B8D] dark:placeholder:text-white/40 bg-transparent border-0 focus:ring-0 text-sm"
          />
          {(isSearching || isAiSearching) && (
            <Loader2 className="w-4 h-4 text-[#5B8DD9] animate-spin flex-shrink-0" />
          )}
        </div>

        <CommandList className="max-h-[350px] bg-[#F8F9FB] dark:bg-[#1a2235] text-[#323D50] dark:text-white">
          {!query && (
            <CommandEmpty className="py-8 text-[#6B7B8D] dark:text-white/50">
              <div className="text-center">
                <Search className="w-8 h-8 mx-auto mb-2 text-[#323D50]/20 dark:text-white/20" />
                <p className="text-sm">{t("search.startTyping")}</p>
                <p className="text-xs text-[#6B7B8D]/60 dark:text-white/30 mt-1">
                  {t("search.tryHint")}
                </p>
              </div>
            </CommandEmpty>
          )}

          {query && results.length === 0 && aiResults.length === 0 && !isSearching && !isAiSearching && (
            <CommandEmpty className="py-8 text-[#6B7B8D] dark:text-white/50">
              <p className="text-sm">{t("search.noResults")} "{query}"</p>
            </CommandEmpty>
          )}

          {results.length > 0 && (
            <CommandGroup heading={<span className="text-[#6B7B8D] dark:text-white/50 text-xs">{t("search.searchResults")}</span>}>
              {results.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => handleSelect(product.id)}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-[#323D50] dark:text-white/80 hover:bg-[#323D50]/5 dark:hover:bg-white/10 data-[selected=true]:bg-[#323D50]/5 dark:data-[selected=true]:bg-white/10 rounded-lg mx-1"
                >
                  <img
                    src={product.images?.[0]?.image_url || ""}
                    alt={product.name}
                    className="w-10 h-10 rounded-lg object-cover border border-[#323D50]/10 dark:border-white/10 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#323D50] dark:text-white truncate">{product.name}</p>
                    <p className="text-xs text-[#6B7B8D] dark:text-white/50">
                      {product.price} LYD &middot; {product.gender || "unisex"} &middot; {product.size}
                    </p>
                  </div>
                  {product.stock_quantity === 0 && (
                    <span className="text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                      {t("search.soldOut")}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {aiResults.length > 0 && (
            <>
              {results.length > 0 && <CommandSeparator className="bg-[#323D50]/10 dark:bg-white/10" />}
              <CommandGroup
                heading={
                  <span className="text-[#6B7B8D] dark:text-white/50 text-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#5B8DD9]" />
                    {t("search.aiRecommendations")}
                  </span>
                }
              >
                {aiResults.map((result: SmartSearchResult) => (
                  <CommandItem
                    key={result.product.id}
                    value={`ai-${result.product.name}`}
                    onSelect={() => handleSelect(result.product.id)}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-[#323D50] dark:text-white/80 hover:bg-[#323D50]/5 dark:hover:bg-white/10 data-[selected=true]:bg-[#323D50]/5 dark:data-[selected=true]:bg-white/10 rounded-lg mx-1"
                  >
                    <img
                      src={result.product.images?.[0]?.image_url || ""}
                      alt={result.product.name}
                      className="w-10 h-10 rounded-lg object-cover border border-[#5B8DD9]/30 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#323D50] dark:text-white truncate">{result.product.name}</p>
                        <span className="text-xs font-medium text-[#5B8DD9] bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          ✨ {result.matchScore}% {t("aiFinder.match")}
                        </span>
                      </div>
                      {result.reason && (
                        <p className="text-xs text-muted-foreground italic line-clamp-2 mt-0.5">{result.reason}</p>
                      )}
                      <p className="text-xs text-[#6B7B8D] dark:text-white/50">
                        {result.product.price} LYD &middot; {result.product.gender || "unisex"} &middot; {result.product.size}
                      </p>
                    </div>
                    {result.product.stock_quantity === 0 && (
                      <span className="text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                        {t("search.soldOut")}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {isAiSearching && (
            <div className="px-4 py-4 text-center">
              <span className="text-xs text-[#5B8DD9] flex items-center justify-center gap-2">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                {t("search.aiSearching")}
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-[#5B8DD9] animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 rounded-full bg-[#5B8DD9] animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 rounded-full bg-[#5B8DD9] animate-bounce [animation-delay:300ms]" />
                </span>
              </span>
            </div>
          )}
        </CommandList>

        <div className="px-4 py-2 border-t border-[#323D50]/10 dark:border-white/10 flex items-center justify-between">
          <span className="text-xs text-[#6B7B8D]/60 dark:text-white/30">
            {results.length + aiResults.length} {t("search.results")}
          </span>
          <span className="text-xs text-[#6B7B8D]/60 dark:text-white/30">
            <kbd className="px-1.5 py-0.5 bg-[#323D50]/10 dark:bg-white/10 rounded text-[#6B7B8D] dark:text-white/50">Esc</kbd> {t("search.escToClose")}
          </span>
        </div>
      </div>
    </CommandDialog>
  );
}
