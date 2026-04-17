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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cart");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [appliedPromo, setAppliedPromo] =
    useState<PromoValidationResult | null>(() => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("cart.promo");
        return saved ? JSON.parse(saved) : null;
      }
      return null;
    });

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (appliedPromo) {
      localStorage.setItem("cart.promo", JSON.stringify(appliedPromo));
    } else {
      localStorage.removeItem("cart.promo");
    }
  }, [appliedPromo]);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    if (item.stock_quantity !== undefined && item.stock_quantity < 1) return;
    trackEvent("cart_add", { product_id: item.id, product_name: item.name, price: item.price, size: item.size });
    setItems((current) => {
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

  const removeFromCart = (id: string, size: string) => {
    trackEvent("cart_remove", { product_id: id, size });
    setItems((current) =>
      current.filter((item) => !(item.id === id && item.size === size))
    );
  };

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

  const getItemCount = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const clearCart = () => {
    setItems([]);
    setAppliedPromo(null);
  };

  const applyPromo = (promo: PromoValidationResult | null) => {
    setAppliedPromo(promo);
  };

  const clearPromo = () => {
    setAppliedPromo(null);
  };

  const isItemInCart = (id: string, size: string) => {
    return items.some((item) => item.id === id && item.size === size);
  };

  const getItemQuantity = (id: string, size: string) => {
    const item = items.find((item) => item.id === id && item.size === size);
    return item ? item.quantity : 0;
  };

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

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
