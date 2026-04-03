import { useState, useEffect, useCallback, useRef } from "react";
import { searchProducts, Product } from "@/services/productsService";
import { smartSearch, SmartSearchResult } from "@/services/aiService";

const TEXT_DEBOUNCE_MS = 300;
const AI_DEBOUNCE_MS = 900;
const AI_MIN_QUERY_LENGTH = 3;

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [aiResults, setAiResults] = useState<SmartSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const textTimer = useRef<ReturnType<typeof setTimeout>>();
  const aiTimer = useRef<ReturnType<typeof setTimeout>>();
  // Keep latest text results so AI search can deduplicate without a race
  const latestTextResults = useRef<Product[]>([]);

  const runTextSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setAiResults([]);
      latestTextResults.current = [];
      return;
    }
    setIsSearching(true);
    try {
      const textResults = await searchProducts(searchQuery);
      setResults(textResults);
      latestTextResults.current = textResults;
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  }, []);

  const runAiSearch = useCallback(async (searchQuery: string) => {
    // Only fire AI for meaningful queries (min length, not pure numbers)
    if (searchQuery.trim().length < AI_MIN_QUERY_LENGTH) return;
    const textResults = latestTextResults.current;
    // Skip AI if text search already found plenty of exact matches
    if (textResults.length >= 5) return;

    setIsAiSearching(true);
    try {
      const smartResults = await smartSearch(searchQuery);
      const uniqueAiResults = smartResults.filter(
        (ai) => !latestTextResults.current.some((t) => t.id === ai.product.id)
      );
      setAiResults(uniqueAiResults);
    } catch {
      // AI search is optional — silent fail
    } finally {
      setIsAiSearching(false);
    }
  }, []);

  useEffect(() => {
    // Clear both timers on every keystroke
    clearTimeout(textTimer.current);
    clearTimeout(aiTimer.current);

    if (!query.trim()) {
      setResults([]);
      setAiResults([]);
      latestTextResults.current = [];
      return;
    }

    // Text search: fast debounce (300ms)
    textTimer.current = setTimeout(() => runTextSearch(query), TEXT_DEBOUNCE_MS);

    // AI search: slow debounce (900ms) — only fires after user pauses typing
    aiTimer.current = setTimeout(() => runAiSearch(query), AI_DEBOUNCE_MS);

    return () => {
      clearTimeout(textTimer.current);
      clearTimeout(aiTimer.current);
    };
  }, [query, runTextSearch, runAiSearch]);

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    setAiResults([]);
    latestTextResults.current = [];
  }, []);

  return { query, setQuery, results, aiResults, isSearching, isAiSearching, reset };
}
