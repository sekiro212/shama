import { useState, useEffect, useCallback, useRef } from "react";
import { searchProducts, Product } from "@/services/productsService";
import { smartSearch, SmartSearchResult } from "@/services/aiService";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [aiResults, setAiResults] = useState<SmartSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setAiResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Tier 1: Instant text search
      const textResults = await searchProducts(searchQuery);
      setResults(textResults);
      setIsSearching(false);

      // Tier 2: AI-powered search for natural language queries
      if (textResults.length < 3 || searchQuery.split(" ").length > 2) {
        setIsAiSearching(true);
        try {
          const smartResults = await smartSearch(searchQuery);
          // Filter out duplicates from text search
          const uniqueAiResults = smartResults.filter(
            (ai) => !textResults.some((t) => t.id === ai.product.id)
          );
          setAiResults(uniqueAiResults);
        } catch {
          // AI search is optional
        } finally {
          setIsAiSearching(false);
        }
      }
    } catch {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      search(query);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, search]);

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    setAiResults([]);
  }, []);

  return { query, setQuery, results, aiResults, isSearching, isAiSearching, reset };
}
