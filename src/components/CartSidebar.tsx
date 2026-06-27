/**
 * ===============================================================
 * CartSidebar.tsx — سلّة التسوّق الجانبية المنزلقة
 * ---------------------------------------------------------------
 * لوحة جانبية (Sheet) تعرض عناصر السلّة مع إمكانية تعديل الكمية،
 * حذف العناصر، تطبيق رمز خصم (promo code)، عرض ملخّص الطلب
 * (المجموع الفرعي، الخصم، الإجمالي)، والانتقال لإتمام الشراء.
 * تتحقّق أيضًا من توفّر الكمية في المخزون قبل السماح بالمتابعة.
 *
 * مكان الاستخدام: تُفتح من زر السلّة في الهيدر عبر الخاصية isOpen.
 * تدعم الاتجاهين العربي (RTL) والإنجليزي (LTR).
 * ===============================================================
 */
import {
  Plus,
  Minus,
  ShoppingBag,
  CreditCard,
  AlertCircle,
  Trash2,
  Eye,
  Tag,
  X,
  Truck,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  validatePromoCode,
  type PromoValidationError,
} from "@/services/promoCodesService";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// خريطة تربط كل سبب فشل في رمز الخصم بمفتاح الترجمة المناسب لعرض رسالة مفهومة للمستخدم
const PROMO_ERROR_KEY: Record<PromoValidationError, string> = {
  INVALID_CODE: "cart.promoCode.errors.invalidCode",
  INACTIVE: "cart.promoCode.errors.inactive",
  EXPIRED: "cart.promoCode.errors.expired",
  USAGE_LIMIT_REACHED: "cart.promoCode.errors.usageLimitReached",
  PER_USER_LIMIT_REACHED: "cart.promoCode.errors.perUserLimitReached",
  BELOW_MIN_ORDER: "cart.promoCode.errors.belowMinOrder",
  NOT_APPLICABLE: "cart.promoCode.errors.notApplicable",
};

/**
 * المكوّن الرئيسي للسلّة الجانبية.
 * @param isOpen هل اللوحة الجانبية مفتوحة حاليًا؟
 * @param onClose دالة تُستدعى لإغلاق اللوحة.
 */
export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  // سياق السلّة: العناصر ودوال التعديل والحذف وحساب الإجمالي ورمز الخصم المطبَّق
  const {
    items,
    removeFromCart,
    updateQuantity,
    getTotalPrice,
    canAddToCart,
    getItemCount,
    appliedPromo,
    applyPromo,
    clearPromo,
  } = useCart();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // حسابات الملخّص: المجموع الفرعي، قيمة الخصم (إن وُجد رمز صالح)، والإجمالي النهائي
  const cartSubtotal = getTotalPrice();
  const cartDiscount = appliedPromo?.valid ? appliedPromo.discount : 0;
  const cartFinalTotal = appliedPromo?.valid
    ? appliedPromo.finalTotal
    : cartSubtotal;

  // تحويل رمز خطأ الخصم إلى نصّ مُترجَم؛ مع استبدال الحدّ الأدنى للطلب في رسالة BELOW_MIN_ORDER
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

  // التحقّق من رمز الخصم عبر الخدمة وتطبيقه إن كان صالحًا، أو عرض رسالة الخطأ المناسبة
  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code || items.length === 0) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const result = await validatePromoCode(code, items, user?.email ?? "");
      if (!result.valid) {
        clearPromo();
        setPromoError(translatePromoError(result.error, result.errorContext));
        return;
      }
      applyPromo(result);
      setPromoError(null);
      toast.success(t("cart.promoCode.applied"));
    } catch (err) {
      console.error("Error validating promo code:", err);
      clearPromo();
      setPromoError(t("cart.promoCode.errors.invalidCode"));
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    clearPromo();
    setPromoInput("");
    setPromoError(null);
  };

  // تغيير كمية عنصر مع منع تجاوز المخزون المتاح وعرض تنبيه إن طُلبت كمية أكبر منه
  const handleQuantityChange = (
    itemId: string,
    size: string,
    newQuantity: number,
    stockQuantity?: number
  ) => {
    if (stockQuantity && newQuantity > stockQuantity) {
      toast.error(
        t("cart.onlyXAvailable").replace("{count}", String(stockQuantity))
      );
      return;
    }
    updateQuantity(itemId, size, newQuantity);
  };

  // هل كل عناصر السلّة ضمن حدود المخزون؟ شرط للسماح بإتمام الشراء
  const isStockAvailable = () =>
    items.every(
      (item) => !item.stock_quantity || item.quantity <= item.stock_quantity
    );

  // إرجاع العناصر التي تجاوزت كميّتها المخزون المتاح لعرضها في رسالة الخطأ
  const getStockErrorItems = () =>
    items.filter(
      (item) => item.stock_quantity && item.quantity > item.stock_quantity
    );

  const handleProceedToCheckout = () => {
    if (!isStockAvailable()) return;
    onClose();
    navigate("/checkout");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      {/* جهة انزلاق اللوحة تتبع اتجاه اللغة: من اليسار في العربية ومن اليمين في الإنجليزية */}
      <SheetContent
        side={isRTL ? "left" : "right"}
        className="bg-[#F8F9FB] dark:bg-[#1a2235] dark:border-white/10 border-[#323D50]/10 w-full sm:w-[480px] lg:w-[540px] px-4 sm:px-6"
      >
        <SheetHeader className="pb-4 sm:pb-6 relative">
          <div className="flex items-center justify-between pr-2">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <SheetTitle className="dark:text-[#F5F5F5] text-[#323D50] text-xl sm:text-2xl font-display">
                {t("cart.title")}
              </SheetTitle>
              {items.length > 0 && (
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className="dark:text-white/70 text-[#6B7B8D] text-sm font-medium">
                    {getItemCount()}{" "}
                    {getItemCount() === 1 ? t("cart.item") : t("cart.items")}
                  </span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-warm rounded-full flex items-center justify-center glow-warm">
                    <span className="text-white text-xs sm:text-sm font-display tabular-nums">
                      {getItemCount()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center flex-col text-center px-4 sm:px-8">
              <div className="glass-card rounded-3xl p-6 sm:p-12 max-w-sm w-full">
                <div className="relative mb-6 mx-auto w-16 h-16 rounded-full bg-warm/10 flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-warm" />
                </div>
                <h3 className="dark:text-[#F5F5F5] text-[#323D50] font-display text-lg sm:text-xl mb-2">
                  {t("cart.empty")}
                </h3>
                <p className="dark:text-white/60 text-[#6B7B8D] text-sm mb-6">
                  {t("cart.emptyDesc")}
                </p>
                <Button
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white rounded-2xl h-12 font-display glow-warm-hover"
                >
                  <ShoppingBag className="w-4 h-4 me-2" />
                  {t("cart.startShopping")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Cart Items - Scrollable */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pb-safe-24 scrollbar-hide">
                {items.map((item) => (
                  <div
                    key={`${item.id}-${item.size}`}
                    className="glass-card rounded-2xl p-3 sm:p-4 hover:shadow-lg transition-all duration-300 focus-within:ring-2 focus-within:ring-warm/40"
                  >
                    <div className="flex items-start space-x-3 sm:space-x-4 rtl:space-x-reverse">
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

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="dark:text-[#F5F5F5] text-[#323D50] font-display text-base sm:text-lg leading-tight mb-1">
                              {item.name}
                            </h4>
                            <span className="inline-block text-[10px] font-medium tracking-wider uppercase text-warm bg-warm/10 rounded-full px-2 py-0.5 mb-2">
                              {item.size}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-display tabular-nums text-lg sm:text-xl text-[#323D50] dark:text-[#F5F5F5]">
                                {item.price}{" "}
                                <span className="text-[10px] tracking-widest uppercase text-warm">
                                  LYD
                                </span>
                              </p>
                              {item.stock_quantity &&
                                item.stock_quantity < 10 && (
                                  <span className="text-orange-300 text-xs bg-orange-500/20 px-2 py-1 rounded-full border border-orange-500/40">
                                    {t("cart.lowStock")}
                                  </span>
                                )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse">
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="rounded-xl px-2 sm:px-3 h-10 w-10 p-0 text-[#6B7B8D] dark:text-white/60 hover:bg-warm/10 hover:text-warm"
                              title={t("cart.viewProduct")}
                            >
                              <Link
                                to={`/product/${
                                  item.id
                                }?size=${encodeURIComponent(item.size)}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl h-10 w-10 p-0 text-[#6B7B8D] dark:text-white/60 hover:bg-red-500/10 hover:text-red-500"
                              onClick={() => removeFromCart(item.id, item.size)}
                              title={t("cart.removeFromCart")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                          <div className="flex items-center space-x-1.5 rtl:space-x-reverse rounded-xl bg-[#323D50]/5 dark:bg-white/5 p-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={t("cart.decreaseQuantity")}
                              className="bg-white dark:bg-white/10 hover:bg-warm/10 dark:hover:bg-warm/20 text-[#323D50] dark:text-[#F5F5F5] rounded-lg h-9 w-9 p-0"
                              onClick={() =>
                                handleQuantityChange(
                                  item.id,
                                  item.size,
                                  item.quantity - 1,
                                  item.stock_quantity
                                )
                              }
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="dark:text-[#F5F5F5] text-[#323D50] font-display tabular-nums text-base w-10 text-center bg-white dark:bg-white/10 rounded-lg py-1">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={t("cart.increaseQuantity")}
                              className="bg-white dark:bg-white/10 hover:bg-warm/10 dark:hover:bg-warm/20 text-[#323D50] dark:text-[#F5F5F5] rounded-lg h-9 w-9 p-0 disabled:opacity-50"
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
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] tracking-widest uppercase text-[#6B7B8D] dark:text-white/60">
                              {t("cart.totalLabel")}
                            </p>
                            <p className="font-display tabular-nums text-lg text-[#323D50] dark:text-[#F5F5F5]">
                              {(item.price * item.quantity).toFixed(2)}{" "}
                              <span className="text-[10px] tracking-widest uppercase text-warm">
                                LYD
                              </span>
                            </p>
                          </div>
                        </div>

                        {item.stock_quantity &&
                          item.quantity > item.stock_quantity && (
                            <div className="mt-3 bg-red-500/15 border border-red-500/30 rounded-xl p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-red-500 text-xs sm:text-sm font-medium">
                                  {t("cart.onlyAvailable").replace(
                                    "{count}",
                                    String(item.stock_quantity)
                                  )}
                                </p>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1 text-xs"
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

              {/* Sticky Summary + Checkout CTA */}
              <div className="sticky bottom-0 bg-[#F8F9FB] dark:bg-[#1a2235] border-t dark:border-white/10 border-[#323D50]/10 pt-4 pb-4 px-4 sm:px-6 -mx-4 sm:-mx-6 z-10">
                <div className="glass-card rounded-2xl p-4 sm:p-6 mb-4">
                  <p className="font-display text-[10px] tracking-[0.32em] text-warm uppercase mb-4">
                    {t("cart.orderSummary")}
                  </p>

                  <div className="space-y-3">
                    {/* Promo */}
                    {appliedPromo?.valid && appliedPromo.promo ? (
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-warm/10 border border-warm/30 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Tag className="w-4 h-4 text-warm shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[10px] tracking-widest uppercase text-warm font-medium truncate">
                              {t("cart.promoCode.applied")}
                            </div>
                            <div className="text-sm font-bold font-mono text-[#323D50] dark:text-white truncate">
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
                              className={`glass dark:bg-white/5 bg-white/80 border-[#323D50]/15 dark:border-white/15 focus:border-warm focus:ring-warm/30 rounded-xl h-10 ${
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
                            className="h-10 px-4 bg-warm hover:bg-warm-glow text-white rounded-xl text-sm font-medium"
                          >
                            {t("cart.promoCode.apply")}
                          </LoadingButton>
                        </div>
                        {promoError && (
                          <p
                            role="alert"
                            aria-live="polite"
                            className="text-xs text-red-500 dark:text-red-400 px-1"
                          >
                            {promoError}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between text-sm dark:text-white/80 text-[#6B7B8D]">
                      <span>{t("cart.subtotal")}</span>
                      <span className="tabular-nums">
                        {cartSubtotal.toFixed(2)} LYD
                      </span>
                    </div>

                    {cartDiscount > 0 && (
                      <div className="flex justify-between text-sm text-warm font-medium">
                        <span>{t("cart.discount")}</span>
                        <span className="tabular-nums">
                          -{cartDiscount.toFixed(2)} LYD
                        </span>
                      </div>
                    )}

                    <div className="border-t dark:border-white/10 border-[#323D50]/10 pt-3 flex items-baseline justify-between">
                      <span className="font-display text-base text-[#323D50] dark:text-[#F5F5F5]">
                        {t("cart.total")}
                      </span>
                      <span className="font-display tabular-nums text-2xl text-[#323D50] dark:text-[#F5F5F5]">
                        {cartFinalTotal.toFixed(2)}{" "}
                        <span className="text-xs tracking-widest uppercase text-warm">
                          LYD
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    {!isStockAvailable() && (
                      <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3">
                        <p className="text-red-500 text-sm font-medium mb-2">
                          {t("cart.stockExceed")}
                        </p>
                        <ul className="text-red-500/90 text-xs space-y-1">
                          {getStockErrorItems().map((item, index) => (
                            <li key={index}>
                              • {item.name} ({item.size}): {item.quantity}{" "}
                              {t("cart.requested")}, {item.stock_quantity}{" "}
                              {t("cart.available")}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Button
                      disabled={!isStockAvailable()}
                      onClick={handleProceedToCheckout}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white rounded-2xl h-14 font-display text-lg tracking-wide glow-warm-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>
                        {isStockAvailable()
                          ? t("cart.proceedToCheckout")
                          : t("cart.stockInsufficient")}
                      </span>
                    </Button>
                    <p className="flex items-center justify-center gap-1.5 text-[10px] tracking-widest uppercase text-[#6B7B8D] dark:text-white/50">
                      <Truck className="w-3 h-3 text-warm" />
                      {t("checkout.trust.fast")}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
