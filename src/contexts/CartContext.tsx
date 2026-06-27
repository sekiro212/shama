/**
 * CartContext.tsx
 * -------------------------------------------------------------------------
 * حالة سلة التسوّق للمتجر بأكمله. تحتفظ بقائمة عناصر السلة بالإضافة إلى أي
 * كود خصم/عرض ترويجي مطبَّق، وتعرض دوال مساعدة للإضافة والإزالة وتحديث
 * الكميات وحساب الإجماليات.
 *
 * تُحفظ السلة والعرض الترويجي في localStorage لتبقى بعد إعادة تحميل الصفحة
 * (هذا الموقع لا يملك سلة على جانب الخادم). تُفرَض حدود المخزون عند كل
 * تعديل، وتُطلَق أحداث التحليلات عند الإضافة/الإزالة.
 * يُستهلك عبر الـ hook المسمى `useCart()`.
 * -------------------------------------------------------------------------
 */
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { trackEvent } from "@/services/trackingService";
import type { PromoValidationResult } from "@/services/promoCodesService";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
  stock_quantity?: number;
  addedAt?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string, size: string) => void;
  updateQuantity: (id: string, size: string, quantity: number) => void;
  getItemCount: () => number;
  getTotalPrice: () => number;
  clearCart: () => void;
  isItemInCart: (id: string, size: string) => boolean;
  getItemQuantity: (id: string, size: string) => number;
  canAddToCart: (item: Omit<CartItem, "quantity">) => boolean;
  moveToSavedForLater?: (id: string, size: string) => void;
  savedForLater?: CartItem[];
  appliedPromo: PromoValidationResult | null;
  applyPromo: (promo: PromoValidationResult | null) => void;
  clearPromo: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Provider يحتفظ بعناصر السلة + العرض الترويجي المطبَّق، مع الحفظ في
 * localStorage. تُهيَّأ الحالة بشكل كسول (lazily) من localStorage ليحتفظ
 * الزائر العائد بسلته. (تجعل حُرّاس `typeof window` هذا آمنًا مع SSR.)
 */
export function CartProvider({ children }: { children: ReactNode }) {
  // تهيئة السلة من localStorage مرة واحدة (يُشغَّل المهيّئ الكسول عند التحميل فقط).
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cart");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // استعادة كود العرض الترويجي المطبَّق سابقًا بالطريقة نفسها.
  const [appliedPromo, setAppliedPromo] =
    useState<PromoValidationResult | null>(() => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("cart.promo");
        return saved ? JSON.parse(saved) : null;
      }
      return null;
    });

  // حفظ السلة في localStorage كلما تغيّرت العناصر
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items]);

  // Mirror the promo into localStorage; clear the key when no promo applies.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (appliedPromo) {
      localStorage.setItem("cart.promo", JSON.stringify(appliedPromo));
    } else {
      localStorage.removeItem("cart.promo");
    }
  }, [appliedPromo]);

  /**
   * Add one unit of a product (identified by id + size) to the cart.
   * Ignores out-of-stock items, increments quantity if the line already
   * exists, and refuses to exceed available stock. Emits a "cart_add" event.
   */
  const addToCart = (item: Omit<CartItem, "quantity">) => {
    // Bail out immediately if the product is flagged out of stock.
    if (item.stock_quantity !== undefined && item.stock_quantity < 1) return;
    trackEvent("cart_add", { product_id: item.id, product_name: item.name, price: item.price, size: item.size });
    setItems((current) => {
      // A cart line is unique per (product id + size) combination.
      const existingItem = current.find(
        (i) => i.id === item.id && i.size === item.size
      );

      if (existingItem) {
        // Check stock availability
        const newQuantity = existingItem.quantity + 1;
        if (item.stock_quantity && newQuantity > item.stock_quantity) {
          return current; // Don't add if exceeds stock
        }

        return current.map((i) =>
          i.id === item.id && i.size === item.size
            ? { ...i, quantity: newQuantity }
            : i
        );
      }

      // Check stock for new item
      if (item.stock_quantity && item.stock_quantity < 1) {
        return current; // Don't add if out of stock
      }

      return [
        ...current,
        {
          ...item,
          quantity: 1,
          addedAt: new Date().toISOString(),
        },
      ];
    });
  };

  /** Remove a specific cart line (id + size) entirely. Emits "cart_remove". */
  const removeFromCart = (id: string, size: string) => {
    trackEvent("cart_remove", { product_id: id, size });
    setItems((current) =>
      current.filter((item) => !(item.id === id && item.size === size))
    );
  };

  /**
   * Set an absolute quantity for a cart line. A quantity of 0 or less removes
   * the line; quantities above available stock are rejected (kept unchanged).
   */
  const updateQuantity = (id: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id, size);
      return;
    }

    setItems((current) =>
      current.map((item) => {
        if (item.id === id && item.size === size) {
          // Check stock availability before updating quantity
          if (item.stock_quantity && quantity > item.stock_quantity) {
            // Don't update if exceeds stock, keep current quantity
            return item;
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  /** Total number of units across all lines (used for the cart badge). */
  const getItemCount = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  /** Cart subtotal (price * quantity summed); discounts are applied elsewhere. */
  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  /** Empty the cart and drop any applied promo (e.g. after a successful order). */
  const clearCart = () => {
    setItems([]);
    setAppliedPromo(null);
  };

  /** Store a validated promo code so totals/UI can reflect the discount. */
  const applyPromo = (promo: PromoValidationResult | null) => {
    setAppliedPromo(promo);
  };

  /** Remove the applied promo without touching cart items. */
  const clearPromo = () => {
    setAppliedPromo(null);
  };

  /** Whether a given product+size line is already in the cart. */
  const isItemInCart = (id: string, size: string) => {
    return items.some((item) => item.id === id && item.size === size);
  };

  /** Current quantity for a product+size line (0 if not present). */
  const getItemQuantity = (id: string, size: string) => {
    const item = items.find((item) => item.id === id && item.size === size);
    return item ? item.quantity : 0;
  };

  /**
   * Whether another unit can be added without exceeding stock.
   * Items with no stock_quantity set are treated as unlimited.
   */
  const canAddToCart = (item: Omit<CartItem, "quantity"> | CartItem) => {
    if (!item.stock_quantity) return true;

    const currentQuantity = getItemQuantity(item.id, item.size);
    return currentQuantity < item.stock_quantity;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        getItemCount,
        getTotalPrice,
        clearCart,
        isItemInCart,
        getItemQuantity,
        canAddToCart,
        appliedPromo,
        applyPromo,
        clearPromo,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

/**
 * Hook to access the cart context.
 * Throws if used outside a `CartProvider`.
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
