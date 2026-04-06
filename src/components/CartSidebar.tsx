import {
  Plus,
  Minus,
  ShoppingBag,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  User,
  AlertCircle,
  Trash2,
  Eye,
  Tag,
  X,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  validatePromoCode,
  incrementPromoCodeUsage,
  type PromoValidationResult,
  type PromoValidationError,
} from "@/services/promoCodesService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  fetchVanexCities,
  fetchVanexSubCities,
  VanexCity,
  VanexSubCity,
} from "@/services/vanexService";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROMO_ERROR_KEY: Record<PromoValidationError, string> = {
  INVALID_CODE: "cart.promoCode.errors.invalidCode",
  INACTIVE: "cart.promoCode.errors.inactive",
  EXPIRED: "cart.promoCode.errors.expired",
  USAGE_LIMIT_REACHED: "cart.promoCode.errors.usageLimitReached",
  PER_USER_LIMIT_REACHED: "cart.promoCode.errors.perUserLimitReached",
  BELOW_MIN_ORDER: "cart.promoCode.errors.belowMinOrder",
  NOT_APPLICABLE: "cart.promoCode.errors.notApplicable",
};

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const {
    items,
    removeFromCart,
    updateQuantity,
    getTotalPrice,
    clearCart,
    canAddToCart,
    getItemCount,
  } = useCart();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<PromoValidationResult | null>(
    null
  );
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    placeName: "",
    vanexCityId: null as number | null,
    vanexSubCityId: null as number | null,
  });

  // Vanex city/sub-city state
  const [vanexCities, setVanexCities] = useState<VanexCity[]>([]);
  const [vanexSubCities, setVanexSubCities] = useState<VanexSubCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [subCitiesLoading, setSubCitiesLoading] = useState(false);

  // Load Vanex cities once when checkout opens
  useEffect(() => {
    if (!isCheckoutOpen || vanexCities.length > 0) return;
    setCitiesLoading(true);
    fetchVanexCities()
      .then(setVanexCities)
      .finally(() => setCitiesLoading(false));
  }, [isCheckoutOpen, vanexCities.length]);

  const handleCitySelect = async (cityId: string) => {
    const id = Number(cityId);
    const city = vanexCities.find((c) => c.id === id);
    setFormData((prev) => ({
      ...prev,
      vanexCityId: id,
      city: city ? `${city.name_en} / ${city.name}` : cityId,
      vanexSubCityId: null,
      placeName: "",
    }));
    setVanexSubCities([]);
    setSubCitiesLoading(true);
    const subs = await fetchVanexSubCities(id);
    setVanexSubCities(subs);
    setSubCitiesLoading(false);
  };

  const handleSubCitySelect = (subCityId: string) => {
    const id = Number(subCityId);
    const sub = vanexSubCities.find((s) => s.sub_city_id === id);
    setFormData((prev) => ({
      ...prev,
      vanexSubCityId: id,
      placeName: sub?.sub_city_name || subCityId,
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQuantityChange = (
    itemId: string,
    size: string,
    newQuantity: number,
    stockQuantity?: number
  ) => {
    // Check if the new quantity exceeds stock
    if (stockQuantity && newQuantity > stockQuantity) {
      toast.error(t("cart.onlyXAvailable").replace("{count}", String(stockQuantity)));
      return;
    }

    updateQuantity(itemId, size, newQuantity);
  };

  const isStockAvailable = () => {
    return items.every(
      (item) => !item.stock_quantity || item.quantity <= item.stock_quantity
    );
  };

  const getStockErrorItems = () => {
    return items.filter(
      (item) => item.stock_quantity && item.quantity > item.stock_quantity
    );
  };

  // Promo state lives here (not in CartContext) so it doesn't survive
  // across sessions — a persisted promo could become stale against the
  // cart or hit per-user-limit checks unexpectedly on the next visit.
  const cartSubtotal = getTotalPrice();
  const cartDiscount = appliedPromo?.discount ?? 0;
  const cartFinalTotal = appliedPromo?.finalTotal ?? cartSubtotal;

  const translatePromoError = (
    error: PromoValidationError | undefined,
    context?: { minOrder?: number }
  ): string => {
    const key = error ? PROMO_ERROR_KEY[error] : PROMO_ERROR_KEY.INVALID_CODE;
    const translated = t(key);
    if (error === "BELOW_MIN_ORDER") {
      return translated.replace("{min}", (context?.minOrder ?? 0).toFixed(2));
    }
    return translated;
  };

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code || items.length === 0) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const result = await validatePromoCode(code, items, user?.email ?? "");
      if (!result.valid) {
        setAppliedPromo(null);
        setPromoError(translatePromoError(result.error, result.errorContext));
        return;
      }
      setAppliedPromo(result);
      setPromoError(null);
      toast.success(t("cart.promoCode.applied"));
    } catch (err) {
      console.error("Error validating promo code:", err);
      setAppliedPromo(null);
      setPromoError(t("cart.promoCode.errors.invalidCode"));
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  };

  const handleCheckout = async () => {
    // Validate form
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.phone ||
      !formData.vanexCityId ||
      !formData.vanexSubCityId
    ) {
      toast.error(t("cart.fillAllFields"));
      return;
    }

    // Validate stock availability before checkout
    const stockErrors = [];
    for (const item of items) {
      if (
        item.stock_quantity !== undefined &&
        item.quantity > item.stock_quantity
      ) {
        stockErrors.push(
          `${item.name} (${item.size}) - Only ${item.stock_quantity} available, but ${item.quantity} requested`
        );
      }
    }

    if (stockErrors.length > 0) {
      toast.error(t("cart.stockInsufItems"));
      stockErrors.forEach((error) => toast.error(error));
      return;
    }

    // Additional validation for sold out items
    const soldOutItems = items.filter((item) => item.stock_quantity === 0);
    if (soldOutItems.length > 0) {
      toast.error(t("cart.soldOutItems"));
      soldOutItems.forEach((item) =>
        toast.error(`${item.name} (${item.size}) - Sold Out`)
      );
      return;
    }

    try {
      setCheckoutLoading(true);

      // Re-validate against the current cart — quantities, email, and
      // per-user count may have shifted since the user clicked Apply.
      let confirmedPromo: PromoValidationResult | null = null;
      if (appliedPromo?.promo) {
        const revalidated = await validatePromoCode(
          appliedPromo.promo.code,
          items,
          formData.email
        );
        if (!revalidated.valid) {
          setAppliedPromo(null);
          const msg = translatePromoError(
            revalidated.error,
            revalidated.errorContext
          );
          setPromoError(msg);
          toast.error(msg);
          return;
        }
        confirmedPromo = revalidated;
        setAppliedPromo(revalidated);
      }

      const orderData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        place_name: formData.placeName,
        vanex_city_id: formData.vanexCityId,
        vanex_sub_city_id: formData.vanexSubCityId,
        subtotal: confirmedPromo?.subtotal ?? cartSubtotal,
        discount_amount: confirmedPromo?.discount ?? 0,
        total: confirmedPromo?.finalTotal ?? cartSubtotal,
        promo_code_id: confirmedPromo?.promo?.id ?? null,
        promo_code_snapshot: confirmedPromo?.promo?.code ?? null,
        order_date: new Date().toISOString(),
        items: items,
      };

      // Insert order into Supabase
      const { data: insertedData, error } = await supabase
        .from("orders")
        .insert([orderData])
        .select();

      if (error) {
        console.error("Error inserting order:", error);
        toast.error(t("cart.orderFailed"));
        return;
      }

      const orderId = insertedData?.[0]?.id;
      if (orderId) {
        setLastOrderId(orderId);
      }

      // Fire-and-forget: never block checkout success on the counter.
      if (confirmedPromo?.promo) {
        incrementPromoCodeUsage(confirmedPromo.promo.id).catch((err) =>
          console.error("Failed to increment promo usage:", err)
        );
      }

      toast.success(t("cart.orderSuccess"));

      clearCart();
      setIsCheckoutOpen(false);
      onClose();

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        city: "",
        placeName: "",
        vanexCityId: null,
        vanexSubCityId: null,
      });
      setVanexSubCities([]);
      setAppliedPromo(null);
      setPromoInput("");
      setPromoError(null);
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error(t("cart.orderFailed"));
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side={isRTL ? "left" : "right"}
        className="bg-[#F8F9FB] dark:bg-[#1a2235] dark:border-white/10 border-[#323D50]/10 w-full sm:w-[480px] lg:w-[540px] px-4 sm:px-6"
      >
        <SheetHeader className="pb-4 sm:pb-6 relative">
          <div className="flex items-center justify-between pr-2">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <SheetTitle className="dark:text-[#F5F5F5] text-[#323D50] text-xl sm:text-2xl font-bold gradient-text">
                {t("cart.title")}
              </SheetTitle>
              {items.length > 0 && (
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className="dark:text-white/70 text-[#6B7B8D] text-sm font-medium">
                    {getItemCount()} {getItemCount() === 1 ? t("cart.item") : t("cart.items")}
                  </span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs sm:text-sm font-bold">
                      {getItemCount()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {/* Close button */}
          </div>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center flex-col text-center px-4 sm:px-8">
              <div className="glass-card dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 rounded-3xl p-6 sm:p-12 max-w-sm w-full">
                {lastOrderId ? (
                  <>
                    <div className="relative mb-6">
                      <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-green-400" />
                      </div>
                    </div>
                    <h3 className="dark:text-[#F5F5F5] text-[#323D50] font-semibold text-lg sm:text-xl mb-2">
                      {t("cart.orderPlaced")}
                    </h3>
                    <p className="dark:text-white/60 text-[#6B7B8D] text-sm mb-2">
                      {t("cart.yourOrderId")}
                    </p>
                    <p className="text-[#5B8DD9] font-mono text-xs mb-4 bg-white dark:bg-white/5 rounded-lg px-3 py-2 break-all">
                      {lastOrderId}
                    </p>
                    <Link
                      to="/track-order"
                      onClick={onClose}
                      className="block w-full glass bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 rounded-xl px-6 py-3 font-semibold transition-all duration-300 hover:scale-105 text-center mb-3"
                    >
                      {t("cart.trackOrder")}
                    </Link>
                    <Button
                      onClick={() => { setLastOrderId(null); onClose(); }}
                      variant="ghost"
                      className="w-full text-[#6B7B8D] dark:text-white/60 hover:text-[#323D50] dark:hover:text-white"
                    >
                      {t("cart.continueShopping")}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="relative mb-6">
                      <ShoppingBag className="h-12 w-12 sm:h-16 sm:w-16 text-[#323D50]/40 dark:text-white/40 mx-auto" />
                      <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-[#5B8DD9] rounded-full flex items-center justify-center">
                        <span className="text-white text-xs sm:text-sm font-bold">
                          0
                        </span>
                      </div>
                    </div>
                    <h3 className="dark:text-[#F5F5F5] text-[#323D50] font-semibold text-lg sm:text-xl mb-2">
                      {t("cart.empty")}
                    </h3>
                    <p className="dark:text-white/60 text-[#6B7B8D] text-sm mb-6">
                      {t("cart.emptyDesc")}
                    </p>
                    <Button
                      onClick={onClose}
                      className="w-full glass bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 rounded-xl px-6 py-3 font-semibold transition-all duration-300 hover:scale-105"
                    >
                      <ShoppingBag className="w-4 h-4 me-2" />
                      {t("cart.startShopping")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Cart Items - Scrollable */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pb-24 scrollbar-hide">
                {items.map((item) => (
                  <div
                    key={`${item.id}-${item.size}`}
                    className="glass-card dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 rounded-2xl p-3 sm:p-4 dark:hover:bg-white/10 hover:bg-[#EDF1F7] transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-[#5B8DD9]/20 focus-within:ring-2 focus-within:ring-[#5B8DD9]/50 focus-within:border-[#5B8DD9]/50"
                  >
                    <div className="flex items-start space-x-3 sm:space-x-4 rtl:space-x-reverse">
                      {/* Product Image */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-[#323D50]/10 dark:border-white/10"
                        />
                        {item.stock_quantity && item.stock_quantity < 10 && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="dark:text-[#F5F5F5] text-[#323D50] font-semibold text-base sm:text-lg leading-tight mb-1">
                              {item.name}
                            </h4>
                            <p className="dark:text-white/60 text-[#6B7B8D] text-sm mb-2">
                              {item.size}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[#e879f9] font-bold text-lg sm:text-xl drop-shadow-sm">
                                {item.price} LYD
                              </p>
                              {item.stock_quantity &&
                                item.stock_quantity < 10 && (
                                  <span className="text-orange-300 text-xs bg-orange-500/30 px-2 py-1 rounded-full border border-orange-500/50">
                                    {t("cart.lowStock")}
                                  </span>
                                )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse">
                            <Button
                              asChild
                              variant="default"
                              size="sm"
                              className="bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white border-0 rounded-xl px-2 sm:px-3 py-2 h-8 sm:h-10 transition-all duration-200 hover:scale-105"
                              title={t("cart.viewProduct")}
                            >
                              <Link
                                to={`/product/${
                                  item.id
                                }?size=${encodeURIComponent(item.size)}`}
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-red-500 hover:bg-red-600 text-white border-0 rounded-xl px-2 sm:px-3 py-2 h-8 sm:h-10 transition-all duration-200 hover:scale-105"
                              onClick={() => removeFromCart(item.id, item.size)}
                              title={t("cart.removeFromCart")}
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                          <div className="flex items-center space-x-1.5 rtl:space-x-reverse dark:bg-white/5 bg-white/10 rounded-xl p-1">
                            <Button
                              variant="default"
                              size="sm"
                              className="dark:bg-white/10 bg-[#EDF1F7] dark:hover:bg-white/20 hover:bg-[#EDF1F7] dark:text-[#F5F5F5] text-[#323D50] border-0 rounded-lg h-7 w-7 sm:h-8 sm:w-8 p-0 transition-all duration-200 hover:scale-105"
                              onClick={() =>
                                handleQuantityChange(
                                  item.id,
                                  item.size,
                                  item.quantity - 1,
                                  item.stock_quantity
                                )
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="dark:text-[#F5F5F5] text-[#323D50] font-bold text-sm sm:text-base w-8 sm:w-10 text-center dark:bg-white/10 bg-[#EDF1F7] rounded-lg py-1">
                              {item.quantity}
                            </span>
                            <Button
                              variant="default"
                              size="sm"
                              className="dark:bg-white/10 bg-[#EDF1F7] dark:hover:bg-white/20 hover:bg-[#EDF1F7] dark:text-[#F5F5F5] text-[#323D50] border-0 rounded-lg h-7 w-7 sm:h-8 sm:w-8 p-0 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() =>
                                handleQuantityChange(
                                  item.id,
                                  item.size,
                                  item.quantity + 1,
                                  item.stock_quantity
                                )
                              }
                              disabled={!canAddToCart(item)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Item Total */}
                          <div className="text-right">
                            <p className="dark:text-white/70 text-[#6B7B8D] text-sm font-medium">
                              {t("cart.totalLabel")}
                            </p>
                            <p className="text-[#e879f9] font-bold text-lg drop-shadow-sm">
                              {(item.price * item.quantity).toFixed(2)} LYD
                            </p>
                          </div>
                        </div>

                        {/* Stock Warning */}
                        {item.stock_quantity &&
                          item.quantity > item.stock_quantity && (
                            <div className="mt-3 bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-red-300 text-xs sm:text-sm font-medium">
                                  {`⚠️ ${t("cart.onlyAvailable").replace("{count}", String(item.stock_quantity))}`}
                                </p>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-red-500/80 hover:bg-red-500 text-white border-0 rounded-lg px-3 py-1 text-xs font-medium transition-all duration-200 hover:scale-105"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.id,
                                      item.size,
                                      item.stock_quantity || 0,
                                      item.stock_quantity
                                    )
                                  }
                                >
                                  {t("cart.fix")}
                                </Button>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sticky Checkout Section */}
              <div className="sticky bottom-0 bg-[#F8F9FB] dark:bg-[#1a2235] border-t dark:border-white/10 border-[#323D50]/10 pt-4 pb-4 px-4 sm:px-6 -mx-4 sm:-mx-6 z-10">
                {/* Order Summary */}
                <div className="glass-card dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 rounded-2xl p-4 sm:p-6 mb-4">
                  <h3 className="dark:text-[#F5F5F5] text-[#323D50] font-semibold text-lg mb-4">
                    {t("cart.orderSummary")}
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between dark:text-white/80 text-[#6B7B8D] font-medium">
                      <span>{`${t("cart.items")} (${getItemCount()})`}</span>
                      <span>{cartSubtotal.toFixed(2)} LYD</span>
                    </div>

                    {appliedPromo?.promo ? (
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-green-500/10 border border-green-500/30 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Tag className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs text-green-700 dark:text-green-400 font-medium truncate">
                              {t("cart.promoCode.applied")}
                            </div>
                            <div className="text-sm font-bold text-[#323D50] dark:text-white font-mono truncate">
                              {appliedPromo.promo.code}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemovePromo}
                          className="h-7 px-2 text-xs text-[#6B7B8D] dark:text-white/70 hover:bg-red-500/10 hover:text-red-500"
                        >
                          <X className="w-3 h-3 me-1" />
                          {t("cart.promoCode.remove")}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Tag
                              className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 ${
                                isRTL ? "right-3" : "left-3"
                              } text-[#6B7B8D] dark:text-white/50 pointer-events-none`}
                            />
                            <Input
                              value={promoInput}
                              onChange={(e) => {
                                setPromoInput(e.target.value);
                                if (promoError) setPromoError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleApplyPromo();
                                }
                              }}
                              placeholder={t("cart.promoCode.placeholder")}
                              className={`glass dark:bg-white/10 bg-white/80 dark:border-white/30 border-[#323D50]/15 dark:text-[#F5F5F5] text-[#323D50] dark:placeholder:text-white/60 placeholder:text-[#6B7B8D] focus:border-[#5B8DD9] focus:ring-[#5B8DD9] rounded-xl h-10 ${
                                isRTL ? "pr-9" : "pl-9"
                              }`}
                              disabled={promoLoading || items.length === 0}
                            />
                          </div>
                          <LoadingButton
                            onClick={handleApplyPromo}
                            loading={promoLoading}
                            loadingText={t("cart.promoCode.applying")}
                            disabled={
                              promoLoading ||
                              items.length === 0 ||
                              !promoInput.trim()
                            }
                            className="h-10 px-4 bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white rounded-xl text-sm font-medium"
                          >
                            {t("cart.promoCode.apply")}
                          </LoadingButton>
                        </div>
                        {promoError && (
                          <p className="text-xs text-red-500 dark:text-red-400 px-1">
                            {promoError}
                          </p>
                        )}
                      </div>
                    )}

                    {appliedPromo?.promo && (
                      <div className="flex justify-between text-sm dark:text-white/80 text-[#6B7B8D]">
                        <span>{t("cart.subtotal")}</span>
                        <span>{cartSubtotal.toFixed(2)} LYD</span>
                      </div>
                    )}
                    {appliedPromo?.promo && cartDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                        <span>{t("cart.discount")}</span>
                        <span>-{cartDiscount.toFixed(2)} LYD</span>
                      </div>
                    )}

                    <div className="border-t dark:border-white/10 border-[#323D50]/10 pt-3 pb-3 ">
                      <div className="flex justify-between text-lg sm:text-xl font-bold">
                        <span className="dark:text-[#F5F5F5] text-[#323D50]">{t("cart.total")}</span>
                        <span className="text-[#e879f9] drop-shadow-sm">
                          {cartFinalTotal.toFixed(2)} LYD
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {!isStockAvailable() && (
                      <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                        <p className="text-red-300 text-sm font-medium mb-2">
                          {`⚠️ ${t("cart.stockExceed")}`}
                        </p>
                        <ul className="text-red-300 text-xs space-y-1">
                          {getStockErrorItems().map((item, index) => (
                            <li key={index}>
                              • {item.name} ({item.size}): {item.quantity}{" "}
                              {t("cart.requested")}, {item.stock_quantity} {t("cart.available")}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Button
                      disabled={!isStockAvailable()}
                      onClick={() => {
                        if (!user) {
                          toast.info(t("auth.signInToCheckout"));
                          onClose();
                          navigate("/login", { state: { from: "/" } });
                          return;
                        }
                        setIsCheckoutOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 glass bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 rounded-2xl py-4 font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#5B8DD9]/25 focus:ring-2 focus:ring-[#5B8DD9]/50 focus:ring-offset-2 focus:ring-offset-[#1a2235] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>
                        {isStockAvailable()
                          ? t("cart.proceedToCheckout")
                          : t("cart.stockInsufficient")}
                      </span>
                    </Button>
                  </div>

                  <Dialog
                    open={isCheckoutOpen}
                    onOpenChange={setIsCheckoutOpen}
                  >
                    <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] max-w-md mx-4 sm:mx-auto">
                      <DialogHeader>
                        <DialogTitle className="dark:text-[#F5F5F5] text-[#323D50] gradient-text text-xl sm:text-2xl">
                          {t("cart.completeOrder")}
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="firstName"
                              className="dark:text-white/90 text-[#6B7B8D] dark:text-[#D6D6D6] font-medium"
                            >
                              <User className="w-4 h-4 inline me-2" />
                              {t("cart.firstName")}
                            </Label>
                            <Input
                              id="firstName"
                              value={formData.firstName}
                              onChange={(e) =>
                                handleInputChange("firstName", e.target.value)
                              }
                              className="glass dark:bg-white/10 bg-white/80 dark:border-white/30 border-[#323D50]/15 dark:text-[#F5F5F5] text-[#323D50] dark:placeholder:text-white/60 placeholder:text-[#6B7B8D] dark:text-[#D6D6D6] focus:border-[#5B8DD9] focus:ring-[#5B8DD9] rounded-xl h-11"
                              placeholder={t("cart.enterFirstName")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="lastName"
                              className="dark:text-white/90 text-[#6B7B8D] dark:text-[#D6D6D6] font-medium"
                            >
                              {t("cart.lastName")}
                            </Label>
                            <Input
                              id="lastName"
                              value={formData.lastName}
                              onChange={(e) =>
                                handleInputChange("lastName", e.target.value)
                              }
                              className="glass dark:bg-white/10 bg-white/80 dark:border-white/30 border-[#323D50]/15 dark:text-[#F5F5F5] text-[#323D50] dark:placeholder:text-white/60 placeholder:text-[#6B7B8D] dark:text-[#D6D6D6] focus:border-[#5B8DD9] focus:ring-[#5B8DD9] rounded-xl h-11"
                              placeholder={t("cart.enterLastName")}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="email"
                            className="dark:text-white/90 text-[#6B7B8D] dark:text-[#D6D6D6] font-medium"
                          >
                            <Mail className="w-4 h-4 inline me-2" />
                            {t("cart.email")}
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              handleInputChange("email", e.target.value)
                            }
                            className="glass dark:bg-white/10 bg-white/80 dark:border-white/30 border-[#323D50]/15 dark:text-[#F5F5F5] text-[#323D50] dark:placeholder:text-white/60 placeholder:text-[#6B7B8D] dark:text-[#D6D6D6] focus:border-[#5B8DD9] focus:ring-[#5B8DD9] rounded-xl h-11"
                            placeholder={t("cart.enterEmail")}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="phone"
                            className="dark:text-white/90 text-[#6B7B8D] dark:text-[#D6D6D6] font-medium"
                          >
                            <Phone className="w-4 h-4 inline me-2" />
                            {t("cart.phone")}
                          </Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) =>
                              handleInputChange("phone", e.target.value)
                            }
                            className="glass dark:bg-white/10 bg-white/80 dark:border-white/30 border-[#323D50]/15 dark:text-[#F5F5F5] text-[#323D50] dark:placeholder:text-white/60 placeholder:text-[#6B7B8D] dark:text-[#D6D6D6] focus:border-[#5B8DD9] focus:ring-[#5B8DD9] rounded-xl h-11"
                            placeholder={t("cart.enterPhone")}
                          />
                        </div>

                        {/* Vanex City Select */}
                        <div className="space-y-2">
                          <Label
                            htmlFor="city"
                            className="dark:text-white/90 text-[#6B7B8D] dark:text-[#D6D6D6] font-medium"
                          >
                            <MapPin className="w-4 h-4 inline me-2" />
                            {t("cart.city")}
                          </Label>
                          <Select
                            value={formData.vanexCityId ? String(formData.vanexCityId) : ""}
                            onValueChange={handleCitySelect}
                            disabled={citiesLoading}
                          >
                            <SelectTrigger className="glass dark:bg-white/10 bg-white/80 dark:border-white/30 border-[#323D50]/15 dark:text-[#F5F5F5] text-[#323D50] focus:border-[#5B8DD9] focus:ring-[#5B8DD9] rounded-xl h-11">
                              <SelectValue
                                placeholder={
                                  citiesLoading
                                    ? "Loading cities..."
                                    : t("cart.selectCity")
                                }
                              />
                            </SelectTrigger>
                            <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] dark:border-white/30 border-[#323D50]/15 max-h-48 rounded-xl">
                              {vanexCities.map((city) => (
                                <SelectItem
                                  key={city.id}
                                  value={String(city.id)}
                                  className="dark:text-[#F5F5F5] text-[#323D50] dark:hover:bg-white/10 hover:bg-[#EDF1F7] dark:focus:bg-white/10 focus:bg-white/10"
                                >
                                  {city.name_en} / {city.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Vanex Sub-city (area) Select — shown after city chosen */}
                        {formData.vanexCityId && (
                          <div className="space-y-2">
                            <Label
                              htmlFor="subCity"
                              className="dark:text-white/90 text-[#6B7B8D] dark:text-[#D6D6D6] font-medium"
                            >
                              <MapPin className="w-4 h-4 inline me-2" />
                              {t("cart.placeName")}
                            </Label>
                            {subCitiesLoading ? (
                              <div className="h-11 rounded-xl glass dark:bg-white/10 bg-white/80 border dark:border-white/30 border-[#323D50]/15 flex items-center px-4 text-sm text-[#6B7B8D] dark:text-white/50">
                                Loading areas...
                              </div>
                            ) : vanexSubCities.length > 0 ? (
                              <Select
                                value={
                                  formData.vanexSubCityId
                                    ? String(formData.vanexSubCityId)
                                    : ""
                                }
                                onValueChange={handleSubCitySelect}
                              >
                                <SelectTrigger className="glass dark:bg-white/10 bg-white/80 dark:border-white/30 border-[#323D50]/15 dark:text-[#F5F5F5] text-[#323D50] focus:border-[#5B8DD9] focus:ring-[#5B8DD9] rounded-xl h-11">
                                  <SelectValue placeholder={t("cart.enterPlaceName")} />
                                </SelectTrigger>
                                <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] dark:border-white/30 border-[#323D50]/15 max-h-48 rounded-xl">
                                  {vanexSubCities.map((sub) => (
                                    <SelectItem
                                      key={sub.sub_city_id}
                                      value={String(sub.sub_city_id)}
                                      className="dark:text-[#F5F5F5] text-[#323D50] dark:hover:bg-white/10 hover:bg-[#EDF1F7] dark:focus:bg-white/10 focus:bg-white/10"
                                    >
                                      {sub.sub_city_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              /* No sub-cities for this city — free text fallback */
                              <Input
                                id="placeName"
                                value={formData.placeName}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    placeName: e.target.value,
                                    vanexSubCityId: -1,
                                  }))
                                }
                                className="glass dark:bg-white/10 bg-white/80 dark:border-white/30 border-[#323D50]/15 dark:text-[#F5F5F5] text-[#323D50] dark:placeholder:text-white/60 placeholder:text-[#6B7B8D] focus:border-[#5B8DD9] focus:ring-[#5B8DD9] rounded-xl h-11"
                                placeholder={t("cart.enterPlaceName")}
                              />
                            )}
                          </div>
                        )}

                        <div className="border-t dark:border-white/10 border-[#323D50]/10 pt-4 sm:pt-6">
                          {appliedPromo?.promo && (
                            <>
                              <div className="flex justify-between text-sm dark:text-white/80 text-[#6B7B8D] mb-1">
                                <span>{t("cart.subtotal")}</span>
                                <span>{cartSubtotal.toFixed(2)} LYD</span>
                              </div>
                              {cartDiscount > 0 && (
                                <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium mb-1">
                                  <span>
                                    {t("cart.discount")} ({appliedPromo.promo.code})
                                  </span>
                                  <span>-{cartDiscount.toFixed(2)} LYD</span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="flex justify-between text-lg sm:text-xl font-bold mb-4 sm:mb-6">
                            <span className="dark:text-[#F5F5F5] text-[#323D50]">{t("cart.total")}</span>
                            <span className="text-[#e879f9] drop-shadow-sm">
                              {cartFinalTotal.toFixed(2)} LYD
                            </span>
                          </div>
                          <LoadingButton
                            onClick={handleCheckout}
                            loading={checkoutLoading}
                            loadingText={t("cart.placingOrder")}
                            className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 rounded-xl py-3 sm:py-4 font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#5B8DD9]/25"
                          >
                            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 me-2" />
                            {t("cart.placeOrder")}
                          </LoadingButton>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
