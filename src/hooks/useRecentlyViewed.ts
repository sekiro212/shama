import { useState, useEffect, useCallback } from "react";

interface RecentlyViewedItem {
  id: string;
  name: string;
  price: number;
  image: string;
  viewedAt: string;
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("recently_viewed");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("recently_viewed", JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: Omit<RecentlyViewedItem, "viewedAt">) => {
    setItems((current) => {
      const filtered = current.filter((i) => i.id !== item.id);
      return [{ ...item, viewedAt: new Date().toISOString() }, ...filtered].slice(0, 10);
    });
  }, []);

  return { items, addItem };
}
