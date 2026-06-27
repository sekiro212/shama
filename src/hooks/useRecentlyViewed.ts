/**
 * useRecentlyViewed.ts — يتتبع المنتجات التي فتحها الزائر مؤخراً.
 *
 * يحفظ قائمة محدودة العدد وخالية من التكرار في localStorage بحيث يبقى شريط
 * "شوهدت مؤخراً" بعد إعادة تحميل الصفحة دون الحاجة إلى خادم خلفي أو مصادقة.
 */
import { useState, useEffect, useCallback } from "react";

/** لقطة منتج مخزّنة لأجل شريط "شوهدت مؤخراً". */
interface RecentlyViewedItem {
  id: string;
  name: string;
  price: number;
  image: string;
  viewedAt: string;
}

/**
 * خطاف يكشف قائمة "شوهدت مؤخراً" وطريقة لتسجيل مشاهدة جديدة.
 * @returns `{ items, addItem }` — القائمة المخزّنة ودالة الإضافة.
 */
export function useRecentlyViewed() {
  // ترطيب (hydrate) كسول من localStorage عند أول رسم (محمي لحالة SSR/غياب window).
  const [items, setItems] = useState<RecentlyViewedItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("recently_viewed");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // عكس كل تغيير إلى localStorage.
  useEffect(() => {
    localStorage.setItem("recently_viewed", JSON.stringify(items));
  }, [items]);

  /**
   * تسجيل مشاهدة منتج: نقله إلى المقدمة، حذف أي نسخة مكررة سابقة، ختمه بالوقت،
   * والاحتفاظ بأحدث 10 عناصر فقط.
   * @param item المنتج المراد تسجيله (يُضاف الطابع الزمني تلقائياً).
   */
  const addItem = useCallback((item: Omit<RecentlyViewedItem, "viewedAt">) => {
    setItems((current) => {
      const filtered = current.filter((i) => i.id !== item.id);
      return [{ ...item, viewedAt: new Date().toISOString() }, ...filtered].slice(0, 10);
    });
  }, []);

  return { items, addItem };
}
