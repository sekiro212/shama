/**
 * ===============================================================
 * OrderDetailView.tsx — عرض تفاصيل طلب واحد
 * ---------------------------------------------------------------
 * يعرض كل تفاصيل الطلب: الرقم والحالة وشريط زمني لمراحل الطلب،
 * قائمة العناصر، تتبّع الشحن عبر Vanex (يُجلَب تلقائيًا عند توفّر
 * رمز الطرد)، بيانات الشحن، طريقة الدفع (مع إيصال التحويل)، وملخّص
 * الإجماليات. يأتي بنمطين: "account" (داخل حساب المستخدم) و"tracking"
 * (صفحة تتبّع الطلب مع زر رجوع).
 *
 * مكان الاستخدام: صفحة "طلباتي" وصفحة تتبّع الطلب.
 * يدعم الاتجاهين العربي (RTL) والإنجليزي (LTR) وتنسيق التواريخ بحسب اللغة.
 * ===============================================================
 */
import { useEffect, useState } from "react";
import {
  MapPin,
  CreditCard,
  Banknote,
  Truck,
  Copy,
  Check,
  ExternalLink,
  Receipt,
  Phone,
  Mail,
  ArrowLeft,
  Loader2,
  User as UserIcon,
  Clock,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import OrderTimeline from "@/components/OrderTimeline";
import type { Order } from "@/services/ordersService";
import {
  trackVanexPackage,
  type VanexTracking,
} from "@/services/vanexService";
import { toast } from "sonner";

// خريطة تربط كل حالة طلب بأصناف التنسيق (ألوان الشارة) المناسبة لها
const STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  confirmed: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  processing: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  accepted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  shipped: "bg-warm/15 text-warm border-warm/30",
  delivered: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  returned: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

interface OrderDetailViewProps {
  order: Order;
  variant: "account" | "tracking";
  onBack?: () => void;
}

/**
 * المكوّن الرئيسي لعرض تفاصيل الطلب.
 * @param order كائن الطلب المراد عرضه.
 * @param variant نمط العرض: "account" داخل حساب المستخدم، أو "tracking" في صفحة التتبّع.
 * @param onBack دالة اختيارية للرجوع (تظهر كزرّ في نمط tracking فقط).
 */
export default function OrderDetailView({
  order,
  variant,
  onBack,
}: OrderDetailViewProps) {
  const { t, language, isRTL } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [vanexTracking, setVanexTracking] = useState<VanexTracking | null>(null);
  const [vanexLoading, setVanexLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // جلب بيانات تتبّع Vanex تلقائيًا متى توفّر رمز الطرد للطلب
  // Auto-fetch Vanex tracking whenever the order has a package code
  useEffect(() => {
    if (!order.vanex_package_code) {
      setVanexTracking(null);
      return;
    }
    // علم cancelled يمنع تحديث الحالة إذا أُلغي الطلب/تغيّر المكوّن قبل وصول الاستجابة (تفادي تسريب الذاكرة)
    let cancelled = false;
    setVanexLoading(true);
    trackVanexPackage(order.vanex_package_code)
      .then((data) => {
        if (!cancelled) setVanexTracking(data);
      })
      .finally(() => {
        if (!cancelled) setVanexLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [order.id, order.vanex_package_code]);

  // نسخ قيمة إلى الحافظة وإظهار علامة "تم النسخ" مؤقتًا بجوار الحقل المنسوخ.
  // نستخدم Clipboard API عند توفّره (سياق آمن HTTPS)، ونرجع إلى execCommand
  // كحلّ بديل، ونلتقط أي خطأ كي لا يفشل النسخ بصمت (المشكلة السابقة).
  const handleCopy = async (value: string, field: string) => {
    const fallbackCopy = () => {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (!ok) throw new Error("execCommand copy failed");
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        fallbackCopy();
      }
      setCopiedField(field);
      toast.success(t("cart.copied"));
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // محاولة أخيرة بالطريقة البديلة قبل إظهار الخطأ
      try {
        fallbackCopy();
        setCopiedField(field);
        toast.success(t("cart.copied"));
        setTimeout(() => setCopiedField(null), 1800);
      } catch {
        toast.error(t("cart.copyFailed"));
      }
    }
  };

  // تنسيق التاريخ بحسب اللغة الحالية: التقويم الليبي العربي (ar-LY) أو الإنجليزي (en-US)
  const formatDate = (value?: string) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString(
      language === "ar" ? "ar-LY" : "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "—";
    return new Date(value).toLocaleString(
      language === "ar" ? "ar-LY" : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // نسخة مختصرة من معرّف الطلب الطويل لعرضها كرقم طلب
  const shortId = order.id.slice(0, 8);
  const statusClass = STATUS_PILL[order.status] ?? STATUS_PILL.pending;

  // المجموع الفرعي للعناصر = مجموع (السعر × الكمية) لكل عنصر
  const itemsSubtotal = Array.isArray(order.items)
    ? order.items.reduce(
        (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0),
        0
      )
    : 0;
  // استنتاج قيمة الخصم من الفرق بين (الفرعي + التوصيل) والإجمالي الفعلي المخزَّن، مع منع القيم السالبة
  const discount = Math.max(0, itemsSubtotal + (order.delivery_fee ?? 0) - (order.total ?? 0));
  const deliveryFee = order.delivery_fee ?? 0;

  const initial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 };
  const animate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <div className="space-y-6">
      {/* Back button — only in tracking variant */}
      {variant === "tracking" && onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="-ml-2 h-9 px-2 text-[#6B7B8D] dark:text-white/60 hover:bg-warm/10 hover:text-warm"
        >
          <ArrowLeft className={`w-4 h-4 me-2 ${isRTL ? "rotate-180" : ""}`} />
          <span className="text-xs tracking-widest uppercase">
            {t("tracking.track")}
          </span>
        </Button>
      )}

      {/* Header */}
      <motion.header
        initial={initial}
        animate={animate}
        transition={{ duration: 0.35 }}
        className="glass-card rounded-3xl p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="font-display text-[11px] tracking-[0.4em] text-warm uppercase">
              {t("orderDetails.eyebrow")}
            </p>
            <div className="flex items-baseline gap-3 mt-2 flex-wrap">
              <h2 className="font-display text-2xl sm:text-3xl text-[#1E2A3D] dark:text-[#F5F5F5] tabular-nums">
                #{shortId}
              </h2>
              <button
                type="button"
                onClick={() => handleCopy(order.id, "id")}
                aria-label={t("orderDetails.copyOrderId")}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] tracking-widest uppercase text-[#6B7B8D] dark:text-white/50 hover:text-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm/50 transition-colors"
              >
                {copiedField === "id" ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {t("orderDetails.copy")}
              </button>
            </div>
            <p className="mt-1 font-display italic text-sm text-[#6B7B8D] dark:text-white/60 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-warm" />
              {t("orderDetails.placedOn")} {formatDateTime(order.order_date || order.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              role="status"
              aria-label={`${t("orderDetails.status")}: ${t(`timeline.${order.status}`) || order.status}`}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display tracking-widest uppercase border ${statusClass}`}
            >
              {t(`timeline.${order.status}`) || order.status}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-8 pt-6 border-t border-dashed border-[#323D50]/15 dark:border-white/10">
          <OrderTimeline currentStatus={order.status} />
        </div>
      </motion.header>

      {/* Three-zone grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
        {/* LEFT — items + Vanex */}
        <motion.div
          initial={initial}
          animate={animate}
          transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.06 }}
          className="space-y-6 min-w-0"
        >
          {/* Items */}
          <section className="glass-card rounded-3xl p-6 sm:p-7">
            <div className="flex items-center justify-between mb-5">
              <p className="font-display text-[11px] tracking-[0.32em] text-warm uppercase">
                {t("orderDetails.items")}
              </p>
              <span className="text-xs text-[#6B7B8D] dark:text-white/50 tabular-nums">
                {Array.isArray(order.items) ? order.items.length : 0}{" "}
                {t("cart.items")}
              </span>
            </div>
            <ul className="space-y-4">
              {Array.isArray(order.items) &&
                order.items.map((item, idx) => (
                  <li
                    key={`${item.id}-${idx}`}
                    className="flex items-start gap-4"
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        width={56}
                        height={56}
                        className="w-14 h-14 object-cover rounded-xl border border-[#323D50]/10 dark:border-white/10 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm sm:text-base text-[#323D50] dark:text-[#F5F5F5] leading-tight line-clamp-2">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] tracking-widest uppercase text-warm bg-warm/10 rounded-full px-2 py-0.5">
                          {item.size}
                        </span>
                        <span className="text-xs text-[#6B7B8D] dark:text-white/60 tabular-nums">
                          × {item.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display tabular-nums text-base text-[#323D50] dark:text-[#F5F5F5]">
                        {(item.price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-[10px] tracking-widest uppercase text-warm">
                        LYD
                      </p>
                    </div>
                  </li>
                ))}
            </ul>
          </section>

          {/* Vanex tracking */}
          {order.vanex_package_code && (
            <section className="glass-card rounded-3xl p-6 sm:p-7">
              <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warm/15 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-warm" />
                  </div>
                  <div>
                    <p className="font-display text-[11px] tracking-[0.32em] text-warm uppercase">
                      {t("orderDetails.tracking")}
                    </p>
                    <p className="font-display text-base text-[#323D50] dark:text-[#F5F5F5] mt-0.5">
                      Vanex
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(order.vanex_package_code!, "vanex")
                  }
                  className="inline-flex items-center gap-2 font-mono text-xs bg-warm/10 border border-warm/30 rounded-full px-3 py-1.5 text-[#323D50] dark:text-[#F5F5F5] hover:bg-warm/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm/50 transition-colors"
                >
                  {order.vanex_package_code}
                  {copiedField === "vanex" ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3 text-warm" />
                  )}
                </button>
              </div>

              {vanexLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#6B7B8D] dark:text-white/60">
                  <Loader2 className="w-4 h-4 animate-spin text-warm" />
                  {t("orderDetails.loadingTracking")}
                </div>
              ) : vanexTracking ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <TrackingStat
                    label={t("orderDetails.currentStatus")}
                    value={
                      language === "ar"
                        ? vanexTracking.status_ar ?? vanexTracking.status
                        : vanexTracking.status
                    }
                  />
                  <TrackingStat
                    label={t("orderDetails.currentLocation")}
                    value={vanexTracking.current_location ?? "—"}
                  />
                  <TrackingStat
                    label={t("orderDetails.estimatedDelivery")}
                    value={vanexTracking.estimated_delivery ?? "—"}
                  />
                </div>
              ) : (
                <p className="text-sm italic text-[#6B7B8D] dark:text-white/60">
                  {t("orderDetails.trackingUnavailable")}
                </p>
              )}
            </section>
          )}

          {/* Awaiting dispatch */}
          {!order.vanex_package_code &&
            order.status !== "delivered" &&
            order.status !== "returned" && (
              <section className="glass-card rounded-3xl p-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warm/15 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-warm" />
                </div>
                <p className="text-sm italic text-[#6B7B8D] dark:text-white/60">
                  {t("orderDetails.awaitingDispatch")}
                </p>
              </section>
            )}
        </motion.div>

        {/* RIGHT — shipping + payment + totals */}
        <motion.aside
          initial={initial}
          animate={animate}
          transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.12 }}
          className="space-y-6 min-w-0 lg:sticky lg:top-24 self-start"
        >
          {/* Shipping card */}
          <section className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-warm/15 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-warm" />
              </div>
              <p className="font-display text-[11px] tracking-[0.32em] text-warm uppercase">
                {t("orderDetails.shipping")}
              </p>
            </div>
            <div className="space-y-2.5 text-sm">
              <DetailLine
                icon={UserIcon}
                value={`${order.first_name} ${order.last_name}`}
              />
              <DetailLine
                icon={Phone}
                value={order.phone || "—"}
                mono
                onCopy={() => handleCopy(order.phone, "phone")}
                copied={copiedField === "phone"}
              />
              <DetailLine icon={Mail} value={order.email || "—"} />
              <DetailLine
                icon={MapPin}
                value={`${order.city}${
                  order.place_name ? ` — ${order.place_name}` : ""
                }`}
              />
            </div>
          </section>

          {/* Payment card */}
          <section className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-warm/15 flex items-center justify-center">
                {order.payment_method === "bank_transfer" ? (
                  <CreditCard className="w-4 h-4 text-warm" />
                ) : (
                  <Banknote className="w-4 h-4 text-warm" />
                )}
              </div>
              <p className="font-display text-[11px] tracking-[0.32em] text-warm uppercase">
                {t("orderDetails.payment")}
              </p>
            </div>
            <p className="font-display text-base text-[#323D50] dark:text-[#F5F5F5]">
              {order.payment_method === "bank_transfer"
                ? t("checkout.payment.transfer")
                : t("checkout.payment.cod")}
            </p>

            {order.payment_method === "bank_transfer" &&
              order.transfer_proof_url && (
                <div className="mt-4 pt-4 border-t border-dashed border-[#323D50]/15 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <img
                      src={order.transfer_proof_url}
                      alt={t("orderDetails.receipt")}
                      className="w-20 h-20 object-cover rounded-xl border border-warm/40 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setReceiptOpen(true)}
                    />
                    <Button
                      variant="ghost"
                      onClick={() => setReceiptOpen(true)}
                      className="gap-2 h-9 px-3 text-warm hover:bg-warm/10 hover:text-warm"
                    >
                      <Receipt className="w-4 h-4" />
                      <span className="text-xs tracking-widest uppercase">
                        {t("orderDetails.viewReceipt")}
                      </span>
                    </Button>
                  </div>
                </div>
              )}
          </section>

          {/* Totals */}
          <section className="glass-card rounded-3xl p-6">
            <p className="font-display text-[11px] tracking-[0.32em] text-warm uppercase mb-4">
              {t("orderDetails.totals")}
            </p>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-[#323D50]/70 dark:text-white/70">
                <span>{t("checkout.summary.subtotal")}</span>
                <span className="tabular-nums">{itemsSubtotal.toFixed(2)} LYD</span>
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
                  {deliveryFee > 0
                    ? `${deliveryFee.toFixed(2)} LYD`
                    : "—"}
                </span>
              </div>
              <div className="border-t border-[#323D50]/15 dark:border-white/10 pt-3 flex items-baseline justify-between">
                <span className="font-display text-base text-[#323D50] dark:text-[#F5F5F5]">
                  {t("checkout.summary.total")}
                </span>
                <span className="font-display tabular-nums text-2xl text-[#323D50] dark:text-[#F5F5F5]">
                  {order.total?.toFixed(2)}{" "}
                  <span className="text-xs tracking-widest uppercase text-warm">LYD</span>
                </span>
              </div>
            </div>
          </section>
        </motion.aside>
      </div>

      {/* Receipt lightbox */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-3xl p-2 bg-[#F8F9FB] dark:bg-[#1a2235] border-warm/30">
          <DialogTitle className="sr-only">
            {t("orderDetails.receipt")}
          </DialogTitle>
          {order.transfer_proof_url && (
            <img
              src={order.transfer_proof_url}
              alt={t("orderDetails.receipt")}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          )}
          <div className="flex items-center justify-end gap-2 p-3">
            <Button asChild variant="ghost" className="text-warm hover:bg-warm/10">
              <a
                href={order.transfer_proof_url}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="w-4 h-4 me-2" />
                {t("orderDetails.openFull")}
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Formatted date for the eyebrow when the status is only "placed" */}
      <span className="sr-only">{formatDate(order.order_date)}</span>
    </div>
  );
}

/**
 * بطاقة صغيرة لعرض إحصائية تتبّع واحدة (مثل: الحالة الحالية، الموقع،
 * موعد التسليم المتوقّع) بعنوان وقيمة.
 */
function TrackingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/40 dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10 p-3">
      <p className="text-[10px] tracking-widest uppercase text-[#6B7B8D] dark:text-white/50">
        {label}
      </p>
      <p className="font-display text-sm text-[#323D50] dark:text-[#F5F5F5] mt-1 line-clamp-2">
        {value}
      </p>
    </div>
  );
}

/**
 * سطر تفصيلي في بطاقة الشحن: أيقونة + قيمة، مع زرّ نسخ اختياري.
 * @param icon الأيقونة المعروضة على يمين/يسار السطر.
 * @param value النصّ المعروض.
 * @param mono عرض القيمة بخطّ أحادي المسافة (للأرقام مثل الهاتف).
 * @param onCopy دالة النسخ الاختيارية؛ يظهر زرّ النسخ فقط عند تمريرها.
 * @param copied هل تمّ النسخ للتوّ؟ (لإظهار علامة الصحّ).
 */
function DetailLine({
  icon: Icon,
  value,
  mono,
  onCopy,
  copied,
}: {
  icon: typeof Phone;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-3.5 h-3.5 text-warm shrink-0" />
      <span
        className={`flex-1 text-[#323D50] dark:text-white/90 break-words ${
          mono ? "font-mono tabular-nums" : "font-display"
        }`}
      >
        {value}
      </span>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          aria-label={t("orderDetails.copy")}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-display tracking-wide text-warm bg-warm/10 hover:bg-warm/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm/50 transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>{t("orderDetails.copy")}</span>
        </button>
      )}
    </div>
  );
}
