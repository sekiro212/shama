/**
 * ===================================================================
 * صفحة إتمام الطلب (Checkout) — المسار: /checkout
 * -------------------------------------------------------------------
 * تجمع بيانات الشحن وطريقة الدفع، تتحقق من توفّر المخزون وصلاحية كود
 * الخصم (promo)، ثم تُنشئ سجل الطلب في جدول orders بقاعدة Supabase
 * وتوجّه المستخدم إلى صفحة نجاح الطلب. تُعاد التوجيه إلى /collection
 * إذا كانت السلة فارغة. تدعم العربية والإنجليزية.
 * ===================================================================
 */
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
import { upsertUserProfile } from "@/services/profileService";
import OrderSummary from "@/pages/checkout/OrderSummary";
import ShippingSection, {
  type ShippingFormData,
  EMPTY_SHIPPING,
} from "@/pages/checkout/ShippingSection";
import PaymentSection, {
  type PaymentMethod,
} from "@/pages/checkout/PaymentSection";
import PlutuOtpDialog from "@/components/checkout/PlutuOtpDialog";
import {
  isPlutuGateway,
  isOtpGateway,
  cardInitiate,
  type PlutuGateway,
} from "@/services/plutuService";

// خريطة تربط كل نوع خطأ في كود الخصم بمفتاح الترجمة المناسب لعرضه للمستخدم
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
 * المكوّن الرئيسي لصفحة إتمام الطلب.
 * يدير حالة نموذج الشحن، طريقة الدفع، رسوم التوصيل، ومنطق إرسال الطلب.
 */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart, appliedPromo, applyPromo, clearPromo } =
    useCart();
  const { user, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  // حالة نافذة الدفع برمز OTP (أدفلي/سداد): تُفتح بعد إنشاء الطلب وتنتظر التأكيد
  const [otpOrderId, setOtpOrderId] = useState<string | null>(null);
  const [otpGateway, setOtpGateway] = useState<PlutuGateway | null>(null);

  const [formData, setFormData] = useState<ShippingFormData>(EMPTY_SHIPPING);
  const [shippingValid, setShippingValid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [transferProofUrl, setTransferProofUrl] = useState<string | null>(null);
  const [subCity, setSubCity] = useState<VanexSubCity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // يصبح true فور إنشاء الطلب بنجاح؛ يمنع حارس "السلة الفارغة" من اعتراض الانتقال
  // إلى صفحة تأكيد الطلب عندما نفرّغ السلة عمدًا بعد الدفع.
  // Set once an order is placed so emptying the cart doesn't trigger the
  // empty-cart redirect and clobber the navigate() to the success page.
  const [orderPlaced, setOrderPlaced] = useState(false);

  // رسوم التوصيل تُؤخذ من المدينة الفرعية المختارة (Vanex)، وتساوي صفرًا قبل الاختيار
  const deliveryFee = subCity?.price ?? 0;

  // أثر جانبي: عند تحميل الصفحة والسلة فارغة نعرض تنبيهًا للمستخدم
  // If cart is empty when page mounts, toast + redirect
  useEffect(() => {
    if (items.length === 0 && !orderPlaced) {
      toast.info(t("checkout.emptyCart"));
    }
  }, [items.length, orderPlaced, t]);

  // أثناء تهيئة جلسة المصادقة لا نعرض شيئًا لتجنّب وميض النموذج أو إعادة توجيه خاطئة.
  if (authLoading) {
    return <div className="min-h-[60dvh]" aria-hidden="true" />;
  }

  // حماية: يجب تسجيل الدخول لإتمام الطلب. الزوّار غير المسجّلين يُحوّلون إلى صفحة
  // الدخول مع حفظ وجهة العودة (/checkout) ليعودوا إلى الدفع بعد الدخول.
  // Require authentication to check out; bounce guests to login and return them after.
  if (!user) {
    return <Navigate to="/login" replace state={{ from: "/checkout" }} />;
  }

  // حماية: منع الوصول لصفحة الدفع بسلة فارغة عبر إعادة التوجيه للمجموعة.
  // يُستثنى ما بعد إتمام الطلب بنجاح، إذ تُفرَّغ السلة عمدًا قبل الانتقال لصفحة النجاح.
  if (items.length === 0 && !orderPlaced) {
    return <Navigate to="/collection" replace />;
  }

  /**
   * تحويل خطأ كود الخصم إلى نص مترجم.
   * في حالة "أقل من الحد الأدنى للطلب" تُدرج قيمة الحد الأدنى داخل النص.
   */
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

  // يُعطّل زر الإرسال إذا كان نموذج الشحن غير صالح، أو اختير الحوالة المصرفية
  // دون رفع إثبات التحويل، أو أثناء جاري الإرسال
  const submitDisabled =
    !shippingValid ||
    (paymentMethod === "bank_transfer" && !transferProofUrl) ||
    submitting;

  /**
   * معالج إرسال الطلب: يتحقق من المخزون، يعيد التحقق من كود الخصم، يحسب
   * الإجمالي النهائي، يُنشئ سجل الطلب في Supabase، ثم يفرّغ السلة ويوجّه
   * المستخدم إلى صفحة نجاح الطلب.
   */
  const handleSubmit = async () => {
    if (submitDisabled) return;

    // حارس المخزون: منع إتمام الطلب إذا تجاوزت كمية أي صنف المخزون المتاح
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
      // المجموع الفرعي لحظة الإرسال (قبل الخصم والتوصيل)
      const subtotalAtSubmit = getTotalPrice();

      // إعادة التحقق من كود الخصم مقابل السلة والبريد الحاليين لمنع التحايل
      // (مثل تجاوز حد الاستخدام لكل مستخدم أو انتهاء الصلاحية أثناء الجلسة)
      // Re-validate promo against current cart + email (per-user limits etc.)
      let confirmedPromo = appliedPromo;
      if (appliedPromo?.promo) {
        const revalidated = await validatePromoCode(
          appliedPromo.promo.code,
          items,
          formData.email
        );
        if (!revalidated.valid) {
          // الكود لم يعد صالحًا: نزيله ونوقف الإرسال مع رسالة خطأ مترجمة
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

      // الإجمالي النهائي وقيمة الخصم: تُؤخذ من نتيجة التحقق إن كان الكود صالحًا
      const finalTotal = confirmedPromo?.valid
        ? confirmedPromo.finalTotal
        : subtotalAtSubmit;
      const discount = confirmedPromo?.valid ? confirmedPromo.discount : 0;

      // تجهيز كائن الطلب الذي سيُحفظ في جدول orders (الأصناف تُخزَّن كـ JSONB)
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
        payment_gateway: isPlutuGateway(paymentMethod) ? paymentMethod : null,
        transfer_proof_url:
          paymentMethod === "bank_transfer" ? transferProofUrl : null,
        total: finalTotal + deliveryFee,
        promo_code_id: confirmedPromo?.promo?.id ?? null,
        promo_code_snapshot: confirmedPromo?.promo?.code ?? null,
        order_date: new Date().toISOString(),
        items: items,
      };

      // إدراج الطلب في قاعدة البيانات واسترجاع السجل المُنشأ (للحصول على معرّفه)
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

      // حفظ بيانات الشحن كملف افتراضي للمستخدم المسجَّل (غير حابس) لتُعبَّأ تلقائيًا لاحقًا
      if (user?.id) {
        upsertUserProfile(user.id, {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          email: formData.email.trim().toLowerCase(),
          city: formData.city,
          place_name: formData.placeName,
          vanex_city_id: formData.vanexCityId,
          vanex_sub_city_id: formData.vanexSubCityId,
        }).catch((err) => console.error("Failed to save user profile:", err));
      }

      // زيادة عدّاد استخدام كود الخصم (بشكل غير حابس؛ لا يُفشل الطلب إن أخفق)
      if (confirmedPromo?.promo) {
        incrementPromoCodeUsage(confirmedPromo.promo.id).catch((err) =>
          console.error("Failed to increment promo usage:", err)
        );
      }

      // مسار الدفع الإلكتروني عبر Plutu: الطلب أُنشئ كـ "غير مدفوع"، ويُعلَّم
      // مدفوعًا فقط من الدالة الطرفية بعد تأكيد Plutu.
      if (isPlutuGateway(paymentMethod)) {
        if (isOtpGateway(paymentMethod)) {
          // بوابات OTP (أدفلي/سداد): نفتح نافذة إدخال الرمز ولا نُفرّغ السلة بعد
          setOtpOrderId(inserted.id);
          setOtpGateway(paymentMethod);
          setSubmitting(false);
          return;
        }
        // بوابات البطاقة/التحويل: نطلب رابط الدفع ثم نعيد توجيه المتصفّح
        try {
          const { redirect_url } = await cardInitiate({
            orderId: inserted.id,
            gateway: paymentMethod,
            lang: isRTL ? "ar" : "en",
            mobileNumber: formData.phone,
          });
          setOrderPlaced(true);
          clearCart();
          window.location.href = redirect_url;
        } catch (err) {
          console.error("Plutu card initiate error:", err);
          toast.error(
            err instanceof Error ? err.message : t("cart.orderFailed"),
          );
          setSubmitting(false);
        }
        return;
      }

      // نجاح (COD / تحويل مصرفي): نعلّم أن الطلب تم لمنع حارس السلة الفارغة من
      // اعتراض الانتقال، ثم نفرّغ السلة وننتقل إلى صفحة تأكيد الطلب
      toast.success(t("cart.orderSuccess"));
      setOrderPlaced(true);
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

            {/* تظهر رسوم التوصيل فقط بعد اختيار المدينة الفرعية (deliveryFee > 0) */}
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

      {/* نافذة الدفع برمز OTP (أدفلي/سداد) */}
      {otpOrderId && otpGateway && (
        <PlutuOtpDialog
          open={!!otpOrderId}
          orderId={otpOrderId}
          gateway={otpGateway}
          onPaid={() => {
            setOtpOrderId(null);
            setOtpGateway(null);
            toast.success(t("cart.orderSuccess"));
            const id = otpOrderId;
            setOrderPlaced(true);
            clearCart();
            navigate(`/order-success/${id}`);
          }}
          onClose={() => {
            // إغلاق دون إتمام الدفع: الطلب يبقى غير مدفوع وقابلاً لإعادة المحاولة
            setOtpOrderId(null);
            setOtpGateway(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * شريط خطوات إتمام الطلب (العنوان ثم الدفع ثم المراجعة).
 * عنصر عرض فقط يُبرز الخطوة الأولى ويرسم فواصل بين الخطوات.
 */
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
