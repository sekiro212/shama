/**
 * WishlistContext.tsx
 * -------------------------------------------------------------------------
 * حالة قائمة الأمنيات ("المنتجات المحفوظة") للمتجر. تخزّن قائمة منزوعة
 * التكرار من المنتجات التي فضّلها المتسوّق، محفوظة في localStorage بحيث
 * تبقى بعد إعادة التحميل. تُصدِر عمليات الإضافة/الإزالة أحداث تحليلات.
 * يُستهلك عبر الـ hook المسمى `useWishlist()`.
 * -------------------------------------------------------------------------
 */
import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from "react";
import { trackEvent } from "@/services/trackingService";

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  gender?: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

/**
 * Provider يحتفظ بعناصر قائمة الأمنيات، يُهيّأ بكسل (lazily) من localStorage
 * ويُعكس إليه عند كل تغيير (تحافظ فحوص `typeof window` على الأمان مع
 * التصيير من الخادم SSR).
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  // التهيئة من localStorage مرة واحدة بحيث تبقى المفضّلات عبر الزيارات.
  const [items, setItems] = useState<WishlistItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wishlist");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // حفظ قائمة الأمنيات كلما تغيّرت.
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wishlist", JSON.stringify(items));
    }
  }, [items]);

  /**
   * إضافة منتج إلى قائمة الأمنيات إن لم يكن موجودًا (يبقى فريدًا حسب id).
   * يمنع كلٌّ من فحص الإرجاع المبكر والفحص داخل المُحدِّث (updater) التكرار.
   */
  const addToWishlist = (item: WishlistItem) => {
    if (items.some((i) => i.id === item.id)) return;
    trackEvent("wishlist_add", { product_id: item.id, product_name: item.name, price: item.price });
    setItems((current) => {
      if (current.some((i) => i.id === item.id)) return current;
      return [...current, item];
    });
  };

  /** إزالة منتج من قائمة الأمنيات حسب id. تُصدِر "wishlist_remove". */
  const removeFromWishlist = (id: string) => {
    trackEvent("wishlist_remove", { product_id: id });
    setItems((current) => current.filter((item) => item.id !== id));
  };

  /** ما إذا كان id المنتج موجودًا حاليًا في قائمة الأمنيات (يقود أيقونات القلب). */
  const isInWishlist = (id: string) => {
    return items.some((item) => item.id === id);
  };

  /** إفراغ قائمة الأمنيات بالكامل. */
  const clearWishlist = () => {
    setItems([]);
  };

  // perf: memoize so every ProductCard consuming this context only re-renders
  // when the wishlist contents change, not on unrelated provider renders.
  const value = useMemo(
    () => ({ items, addToWishlist, removeFromWishlist, isInWishlist, clearWishlist }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

/**
 * Hook للوصول إلى سياق قائمة الأمنيات (wishlist context).
 * يطلق خطأً إذا استُخدم خارج `WishlistProvider`.
 */
export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
