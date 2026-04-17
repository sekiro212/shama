import { useState } from "react";
import {
  Tag,
  X,
  Truck,
  ShieldCheck,
  Package,
  ShoppingBag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  validatePromoCode,
  type PromoValidationError,
} from "@/services/promoCodesService";

const PROMO_ERROR_KEY: Record<PromoValidationError, string> = {
  INVALID_CODE: "cart.promoCode.errors.invalidCode",
  INACTIVE: "cart.promoCode.errors.inactive",
  EXPIRED: "cart.promoCode.errors.expired",
  USAGE_LIMIT_REACHED: "cart.promoCode.errors.usageLimitReached",
  PER_USER_LIMIT_REACHED: "cart.promoCode.errors.perUserLimitReached",
  BELOW_MIN_ORDER: "cart.promoCode.errors.belowMinOrder",
  NOT_APPLICABLE: "cart.promoCode.errors.notApplicable",
};

interface OrderSummaryProps {
  deliveryFee: number;
  userEmail: string;
}

export default function OrderSummary({ deliveryFee, userEmail }: OrderSummaryProps) {
  const {
    items,
    getTotalPrice,
    getItemCount,
    appliedPromo,
    applyPromo,
    clearPromo,
  } = useCart();
  const { t, isRTL } = useLanguage();

  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const subtotal = getTotalPrice();
  const discount = appliedPromo?.valid ? appliedPromo.discount : 0;
  const finalTotal = appliedPromo?.valid ? appliedPromo.finalTotal : subtotal;
  const grandTotal = finalTotal + deliveryFee;
  const itemCount = getItemCount();

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

  const handleApply = async () => {
    const code = promoInput.trim();
    if (!code || items.length === 0) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const result = await validatePromoCode(code, items, userEmail);
      if (!result.valid) {
        clearPromo();
        setPromoError(translatePromoError(result.error, result.errorContext));
        return;
      }
      applyPromo(result);
      toast.success(t("cart.promoCode.applied"));
    } catch (err) {
      console.error("Promo validation error:", err);
      clearPromo();
      setPromoError(t("cart.promoCode.errors.invalidCode"));
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemove = () => {
    clearPromo();
    setPromoInput("");
    setPromoError(null);
  };

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[10px] tracking-[0.32em] text-warm uppercase">
            {t("checkout.summary.heading")}
          </p>
          <p className="mt-1 text-sm text-[#6B7B8D] dark:text-white/60">
            {itemCount === 1
              ? t("checkout.summary.itemCount_one").replace("{{count}}", String(itemCount))
              : t("checkout.summary.itemCount_other").replace("{{count}}", String(itemCount))}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-warm/15 flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-warm" />
        </div>
      </div>

      {/* Items list */}
      <ul className="space-y-4 max-h-[280px] overflow-y-auto pr-1 scrollbar-hide">
        {items.map((item) => (
          <li
            key={`${item.id}-${item.size}`}
            className="flex items-start gap-3"
          >
            <div className="relative shrink-0">
              <img
                src={item.image}
                alt={item.name}
                width={52}
                height={52}
                className="w-[52px] h-[52px] object-cover rounded-xl border border-[#323D50]/10 dark:border-white/10"
              />
              <span className="absolute -top-1.5 -right-1.5 bg-warm text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm text-[#323D50] dark:text-[#F5F5F5] leading-tight line-clamp-2">
                {item.name}
              </p>
              <span className="inline-block mt-1 text-[10px] font-medium tracking-wider uppercase text-warm bg-warm/10 rounded-full px-2 py-0.5">
                {item.size}
              </span>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display tabular-nums text-sm text-[#323D50] dark:text-[#F5F5F5]">
                {(item.price * item.quantity).toFixed(2)}
              </p>
              <p className="text-[10px] tracking-widest uppercase text-[#6B7B8D] dark:text-white/50">LYD</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-dashed border-[#323D50]/15 dark:border-white/10" />

      {/* Promo code */}
      {appliedPromo?.valid ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-warm/10 border border-warm/30 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Tag className="w-4 h-4 text-warm shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] tracking-widest uppercase text-warm font-medium">
                {t("cart.promoCode.applied")}
              </p>
              <p className="font-mono text-sm font-semibold text-[#323D50] dark:text-white truncate">
                {appliedPromo.promo?.code}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            aria-label={t("cart.promoCode.remove")}
            className="h-8 w-8 p-0 text-[#6B7B8D] dark:text-white/70 hover:bg-red-500/10 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
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
                    handleApply();
                  }
                }}
                placeholder={t("cart.promoCode.placeholder")}
                className={`glass dark:bg-white/5 bg-white/80 border-[#323D50]/15 dark:border-white/15 focus:border-warm focus:ring-warm/30 rounded-xl h-11 ${
                  isRTL ? "pr-9" : "pl-9"
                }`}
                disabled={promoLoading || items.length === 0}
              />
            </div>
            <LoadingButton
              onClick={handleApply}
              loading={promoLoading}
              loadingText={t("cart.promoCode.applying")}
              disabled={
                promoLoading || items.length === 0 || !promoInput.trim()
              }
              className="h-11 px-5 bg-warm hover:bg-warm-glow text-white rounded-xl text-sm font-medium"
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

      {/* Totals */}
      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between text-[#323D50]/70 dark:text-white/70">
          <span>{t("checkout.summary.subtotal")}</span>
          <span className="tabular-nums">{subtotal.toFixed(2)} LYD</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-warm font-medium">
            <span>{t("checkout.summary.discount")}</span>
            <span className="tabular-nums">-{discount.toFixed(2)} LYD</span>
          </div>
        )}
        <div className="flex justify-between text-[#323D50]/70 dark:text-white/70">
          <span>{t("checkout.summary.delivery")}</span>
          <span className="tabular-nums">
            {deliveryFee > 0 ? (
              `${deliveryFee.toFixed(2)} LYD`
            ) : (
              <span className="italic text-[#6B7B8D] dark:text-white/50">
                {t("checkout.summary.deliveryPending")}
              </span>
            )}
          </span>
        </div>
        <div className="border-t border-[#323D50]/15 dark:border-white/10 pt-3 flex items-baseline justify-between">
          <span className="font-display text-base text-[#323D50] dark:text-[#F5F5F5]">
            {t("checkout.summary.total")}
          </span>
          <span className="font-display tabular-nums text-2xl text-[#323D50] dark:text-[#F5F5F5]">
            {grandTotal.toFixed(2)}{" "}
            <span className="text-xs tracking-widest uppercase text-warm">LYD</span>
          </span>
        </div>
      </div>

      {/* Trust band */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-dashed border-[#323D50]/15 dark:border-white/10">
        <TrustBadge icon={ShieldCheck} label={t("checkout.trust.secure")} />
        <TrustBadge icon={Truck} label={t("checkout.trust.fast")} />
        <TrustBadge icon={Package} label={t("checkout.trust.returns")} />
      </div>
    </div>
  );
}

function TrustBadge({
  icon: Icon,
  label,
}: {
  icon: typeof ShieldCheck;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-1.5 pt-3">
      <div className="w-8 h-8 rounded-full bg-warm/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-warm" />
      </div>
      <span className="text-[10px] tracking-wider text-[#6B7B8D] dark:text-white/60 leading-tight">
        {label}
      </span>
    </div>
  );
}
