import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { CreditCard, Lock, ArrowLeft, Truck } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  validatePromoCode,
  incrementPromoCodeUsage,
  type PromoValidationError,
} from "@/services/promoCodesService";
import type { VanexSubCity } from "@/services/vanexService";
import OrderSummary from "@/pages/checkout/OrderSummary";
import ShippingSection, {
  type ShippingFormData,
  EMPTY_SHIPPING,
} from "@/pages/checkout/ShippingSection";
import PaymentSection, {
  type PaymentMethod,
} from "@/pages/checkout/PaymentSection";

const PROMO_ERROR_KEY: Record<PromoValidationError, string> = {
  INVALID_CODE: "cart.promoCode.errors.invalidCode",
  INACTIVE: "cart.promoCode.errors.inactive",
  EXPIRED: "cart.promoCode.errors.expired",
  USAGE_LIMIT_REACHED: "cart.promoCode.errors.usageLimitReached",
  PER_USER_LIMIT_REACHED: "cart.promoCode.errors.perUserLimitReached",
  BELOW_MIN_ORDER: "cart.promoCode.errors.belowMinOrder",
  NOT_APPLICABLE: "cart.promoCode.errors.notApplicable",
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart, appliedPromo, applyPromo, clearPromo } =
    useCart();
  const { user } = useAuth();
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  const [formData, setFormData] = useState<ShippingFormData>(EMPTY_SHIPPING);
  const [shippingValid, setShippingValid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [transferProofUrl, setTransferProofUrl] = useState<string | null>(null);
  const [subCity, setSubCity] = useState<VanexSubCity | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const deliveryFee = subCity?.price ?? 0;

  // If cart is empty when page mounts, toast + redirect
  useEffect(() => {
    if (items.length === 0) {
      toast.info(t("checkout.emptyCart"));
    }
  }, [items.length, t]);

  if (items.length === 0) {
    return <Navigate to="/collection" replace />;
  }

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

  const submitDisabled =
    !shippingValid ||
    (paymentMethod === "bank_transfer" && !transferProofUrl) ||
    submitting;

  const handleSubmit = async () => {
    if (submitDisabled) return;

    // Stock guard
    const stockErrors = items.filter(
      (i) => i.stock_quantity !== undefined && i.quantity > i.stock_quantity
    );
    if (stockErrors.length > 0) {
      toast.error(t("cart.stockInsufItems"));
      return;
    }

    setSubmitting(true);

    try {
      const subtotalAtSubmit = getTotalPrice();

      // Re-validate promo against current cart + email (per-user limits etc.)
      let confirmedPromo = appliedPromo;
      if (appliedPromo?.promo) {
        const revalidated = await validatePromoCode(
          appliedPromo.promo.code,
          items,
          formData.email
        );
        if (!revalidated.valid) {
          clearPromo();
          toast.error(
            translatePromoError(revalidated.error, revalidated.errorContext)
          );
          setSubmitting(false);
          return;
        }
        confirmedPromo = revalidated;
        applyPromo(revalidated);
      }

      const finalTotal = confirmedPromo?.valid
        ? confirmedPromo.finalTotal
        : subtotalAtSubmit;
      const discount = confirmedPromo?.valid ? confirmedPromo.discount : 0;

      const orderData = {
        user_id: user?.id ?? null,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone,
        city: formData.city,
        place_name: formData.placeName,
        vanex_city_id: formData.vanexCityId,
        vanex_sub_city_id: formData.vanexSubCityId,
        subtotal: subtotalAtSubmit,
        discount_amount: discount,
        delivery_fee: deliveryFee,
        payment_method: paymentMethod,
        transfer_proof_url:
          paymentMethod === "bank_transfer" ? transferProofUrl : null,
        total: finalTotal + deliveryFee,
        promo_code_id: confirmedPromo?.promo?.id ?? null,
        promo_code_snapshot: confirmedPromo?.promo?.code ?? null,
        order_date: new Date().toISOString(),
        items: items,
      };

      const { data: inserted, error } = await supabase
        .from("orders")
        .insert([orderData])
        .select()
        .single();

      if (error || !inserted) {
        console.error("Order insert error:", error);
        toast.error(t("cart.orderFailed"));
        setSubmitting(false);
        return;
      }

      if (confirmedPromo?.promo) {
        incrementPromoCodeUsage(confirmedPromo.promo.id).catch((err) =>
          console.error("Failed to increment promo usage:", err)
        );
      }

      toast.success(t("cart.orderSuccess"));
      clearCart();
      navigate(`/order-success/${inserted.id}`);
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error(t("cart.orderFailed"));
      setSubmitting(false);
    }
  };

  const initial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 };
  const animate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <div className="grain-bg relative min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] pt-20 sm:pt-24 pb-16 overflow-hidden">
      {/* Warm glow + blur orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-warm/15 blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-96 h-96 rounded-full bg-[#5B8DD9]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <motion.header
          initial={initial}
          animate={animate}
          transition={{ duration: 0.35 }}
          className="mb-10 sm:mb-14"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 -ml-2 h-9 px-2 text-[#6B7B8D] dark:text-white/60 hover:bg-warm/10 hover:text-warm"
          >
            <ArrowLeft className="w-4 h-4 me-2" />
            <span className="text-xs tracking-widest uppercase">
              {t("cart.continueShopping")}
            </span>
          </Button>
          <p className="font-display text-[11px] sm:text-xs tracking-[0.4em] text-warm uppercase">
            {t("checkout.eyebrow")}
          </p>
          <h1 className="font-display text-3xl sm:text-5xl text-[#1E2A3D] dark:text-[#F5F5F5] mt-2 text-glow-warm">
            {t("checkout.title")}
          </h1>
          <StepStrip />
        </motion.header>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-8">
          <motion.div
            initial={initial}
            animate={animate}
            transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.05 }}
            className="space-y-6"
          >
            <ShippingSection
              formData={formData}
              onChange={setFormData}
              onValidChange={setShippingValid}
              onSubCityChange={setSubCity}
            />

            <PaymentSection
              method={paymentMethod}
              onMethodChange={setPaymentMethod}
              transferProofUrl={transferProofUrl}
              onTransferProofChange={setTransferProofUrl}
            />

            {/* Delivery fee hint when sub-city is picked */}
            {deliveryFee > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-warm/30 bg-warm/5 px-5 py-4">
                <Truck className="w-5 h-5 text-warm shrink-0" />
                <p className="text-sm text-[#323D50] dark:text-white">
                  {t("cart.deliveryFeeLabel")}:{" "}
                  <span className="font-display tabular-nums text-base">
                    {deliveryFee.toFixed(2)} LYD
                  </span>
                </p>
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <LoadingButton
                onClick={handleSubmit}
                loading={submitting}
                loadingText={t("checkout.submitting")}
                disabled={submitDisabled}
                className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white rounded-2xl h-14 font-display text-lg tracking-wide glow-warm-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-5 h-5 me-2" />
                {t("checkout.submit")}
              </LoadingButton>
              <p className="flex items-center justify-center gap-1.5 mt-3 text-xs text-[#6B7B8D] dark:text-white/60">
                <Lock className="w-3 h-3 text-warm" />
                {t("checkout.trust.secure")}
              </p>
            </div>
          </motion.div>

          {/* Sticky summary on desktop */}
          <motion.aside
            initial={initial}
            animate={animate}
            transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.1 }}
            className="lg:sticky lg:top-24 self-start"
          >
            <OrderSummary
              deliveryFee={deliveryFee}
              userEmail={user?.email ?? formData.email}
            />
          </motion.aside>
        </div>
      </div>
    </div>
  );
}

function StepStrip() {
  const { t } = useLanguage();
  const steps = [
    t("checkout.steps.address"),
    t("checkout.steps.payment"),
    t("checkout.steps.review"),
  ];
  return (
    <div className="mt-6 flex items-center gap-3">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-display tabular-nums ${
                i === 0
                  ? "bg-warm text-white"
                  : "bg-[#323D50]/10 dark:bg-white/10 text-[#6B7B8D] dark:text-white/60"
              }`}
            >
              {i + 1}
            </span>
            <span className="text-[11px] tracking-widest uppercase text-[#6B7B8D] dark:text-white/60">
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span className="w-8 sm:w-12 h-px bg-[#323D50]/20 dark:bg-white/20" />
          )}
        </div>
      ))}
    </div>
  );
}
