/**
 * useSearch.ts — بحث منتجات من مستويين لنافذة البحث.
 *
 * يشغّل بحثاً نصياً سريعاً في قاعدة البيانات، وفقط عندما يعيد ذلك نتائج قليلة،
 * يشغّل بحثاً ذكياً أبطأ بالذكاء الاصطناعي كحل بديل. يعمل الاثنان على مؤقّتات
 * debounce مستقلة، وتُزال تكرارات نتائج الذكاء الاصطناعي مقابل النتائج النصية.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { searchProducts, Product } from "@/services/productsService";
import { smartSearch, SmartSearchResult } from "@/services/aiService";
import { trackEvent } from "@/services/trackingService";

// البحث النصي يتفاعل بسرعة؛ البحث الذكي ينتظر أطول (ولا يعمل إلا للاستعلامات
// الحقيقية) لتجنّب استهلاك استدعاءات API مع كل ضغطة مفتاح.
const TEXT_DEBOUNCE_MS = 300;
const AI_DEBOUNCE_MS = 900;
const AI_MIN_QUERY_LENGTH = 3;

/**
 * خطاف يشغّل نافذة البحث العامة.
 * @returns حالة/مُحدّد الاستعلام، مصفوفتي النتائج النصية والذكية، علامتي التحميل، ودالة إعادة تعيين.
 */
export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [aiResults, setAiResults] = useState<SmartSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const textTimer = useRef<ReturnType<typeof setTimeout>>();
  const aiTimer = useRef<ReturnType<typeof setTimeout>>();
  // الاحتفاظ بأحدث نتائج نصية حتى يتمكن البحث الذكي من إزالة التكرار دون تسابق (race)
  const latestTextResults = useRef<Product[]>([]);

  /** يشغّل البحث النصي السريع في قاعدة البيانات ويخزّن النتائج لخطوة الذكاء الاصطناعي. */
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
      trackEvent("search_query", { query: searchQuery, result_count: textResults.length });
    } catch {
      // تجاهل
    } finally {
      setIsSearching(false);
    }
  }, []);

  /** يشغّل البحث الدلالي بالذكاء الاصطناعي كحل بديل، ويتخطاه عند عدم جدواه. */
  const runAiSearch = useCallback(async (searchQuery: string) => {
    // إطلاق الذكاء الاصطناعي فقط للاستعلامات ذات المعنى (طول أدنى، وليست أرقاماً صرفة)
    if (searchQuery.trim().length < AI_MIN_QUERY_LENGTH) return;
    const textResults = latestTextResults.current;
    // تخطّي الذكاء الاصطناعي إذا وجد البحث النصي مطابقات دقيقة كثيرة بالفعل
    if (textResults.length >= 5) return;

    setIsAiSearching(true);
    try {
      const smartResults = await smartSearch(searchQuery);
      // إسقاط أي اقتراح من الذكاء الاصطناعي موجود أصلاً في النتائج النصية لتجنّب التكرار.
      const uniqueAiResults = smartResults.filter(
        (ai) => !latestTextResults.current.some((t) => t.id === ai.product.id)
      );
      setAiResults(uniqueAiResults);
      trackEvent("ai_search_query", {
        query: searchQuery,
        result_count: smartResults.length,
        top_match_score: smartResults[0]?.matchScore ?? null,
      });
    } catch {
      // البحث الذكي اختياري — يفشل بصمت
    } finally {
      setIsAiSearching(false);
    }
  }, []);

  useEffect(() => {
    // مسح كلا المؤقّتين مع كل ضغطة مفتاح
    clearTimeout(textTimer.current);
    clearTimeout(aiTimer.current);

    if (!query.trim()) {
      setResults([]);
      setAiResults([]);
      latestTextResults.current = [];
      return;
    }

    // البحث النصي: debounce سريع (300 مللي ثانية)
    textTimer.current = setTimeout(() => runTextSearch(query), TEXT_DEBOUNCE_MS);

    // البحث الذكي: debounce بطيء (900 مللي ثانية) — لا يُطلَق إلا بعد توقف المستخدم عن الكتابة
    aiTimer.current = setTimeout(() => runAiSearch(query), AI_DEBOUNCE_MS);

    return () => {
      clearTimeout(textTimer.current);
      clearTimeout(aiTimer.current);
    };
  }, [query, runTextSearch, runAiSearch]);

  /** يمسح الاستعلام وكل النتائج (يُستخدم عند إغلاق النافذة). */
  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    setAiResults([]);
    latestTextResults.current = [];
  }, []);

  return { query, setQuery, results, aiResults, isSearching, isAiSearching, reset };
}
