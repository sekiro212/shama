/**
 * ====================================================================
 * PaymentSection — قسم طريقة الدفع في صفحة إتمام الشراء (Checkout)
 * --------------------------------------------------------------------
 * يتيح للمستخدم اختيار طريقة الدفع: الدفع عند الاستلام (COD) أو التحويل
 * المصرفي (bank transfer). عند اختيار التحويل تظهر بيانات الحساب البنكي
 * مع إمكانية النسخ، وحقل رفع إيصال التحويل إلى تخزين Supabase.
 * يدعم اللغتين العربية والإنجليزية عبر useLanguage().
 * ====================================================================
 */
import { useRef, useState } from "react";
import {
  CreditCard,
  Banknote,
  Upload,
  Copy,
  Check,
  X,
  Smartphone,
  Landmark,
  Wallet,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { BANK_DETAILS } from "@/lib/orderUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

// طرق الدفع المدعومة:
// "cod" دفع عند الاستلام، "bank_transfer" تحويل مصرفي،
// وبوابات Plutu للدفع الإلكتروني (قيمة الطريقة = معرّف البوابة في Plutu):
//   edfali (أدفلي), sadadapi (سداد) — برمز OTP،
//   localbankcards (بطاقات محلية), tlync (تي-لينك), mpgs (ماستر/فيزا) — بإعادة توجيه.
export type PaymentMethod =
  | "cod"
  | "bank_transfer"
  | "edfali"
  | "sadadapi"
  | "localbankcards"
  | "tlync"
  | "mpgs";

// بوابات Plutu المعروضة كمجموعة "الدفع الإلكتروني"، بأيقونة ومفتاح ترجمة لكلٍّ منها
const PLUTU_OPTIONS: {
  id: PaymentMethod;
  icon: typeof CreditCard;
  labelKey: string;
  subKey: string;
}[] = [
  { id: "edfali", icon: Smartphone, labelKey: "checkout.payment.edfali", subKey: "checkout.payment.edfaliSub" },
  { id: "sadadapi", icon: Wallet, labelKey: "checkout.payment.sadad", subKey: "checkout.payment.sadadSub" },
  { id: "localbankcards", icon: CreditCard, labelKey: "checkout.payment.localcards", subKey: "checkout.payment.localcardsSub" },
  { id: "tlync", icon: Landmark, labelKey: "checkout.payment.tlync", subKey: "checkout.payment.tlyncSub" },
  { id: "mpgs", icon: CreditCard, labelKey: "checkout.payment.mpgs", subKey: "checkout.payment.mpgsSub" },
];

/**
 * خصائص المكوّن:
 * - method: طريقة الدفع المختارة حاليًا.
 * - onMethodChange: دالة تغيير طريقة الدفع.
 * - transferProofUrl: رابط إيصال التحويل المرفوع (أو null).
 * - onTransferProofChange: دالة تحديث رابط الإيصال بعد الرفع أو الحذف.
 */
interface PaymentSectionProps {
  method: PaymentMethod;
  onMethodChange: (m: PaymentMethod) => void;
  transferProofUrl: string | null;
  onTransferProofChange: (url: string | null) => void;
}

/**
 * المكوّن الرئيسي لاختيار طريقة الدفع ورفع إيصال التحويل.
 */
export default function PaymentSection({
  method,
  onMethodChange,
  transferProofUrl,
  onTransferProofChange,
}: PaymentSectionProps) {
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  /**
   * تنسخ نصًّا (رقم حساب أو IBAN) إلى الحافظة، وتعرض إشعارًا، وتُبرِز الحقل
   * المنسوخ مؤقتًا (1.8 ثانية) عبر copiedField.
   */
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(t("cart.copied"));
    setTimeout(() => setCopiedField(null), 1800);
  };

  /**
   * يتحقّق من نوع الملف وحجمه ثم يرفع إيصال التحويل إلى تخزين Supabase،
   * ويعيد رابطه العام عبر onTransferProofChange. يقبل JPEG/PNG/WebP بحد 5MB.
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقّق من أن نوع الملف ضمن الصيغ المسموح بها للصور
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }
    // رفض الملفات التي يتجاوز حجمها 5 ميغابايت
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      // اسم ملف فريد يعتمد على الطابع الزمني لتفادي التعارض في التخزين
      const ext = file.name.split(".").pop();
      const fileName = `proof_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("transfer-proofs")
        .upload(fileName, file, { upsert: false, cacheControl: "3600" });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Failed to upload image");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("transfer-proofs").getPublicUrl(fileName);

      onTransferProofChange(publicUrl);
      toast.success(t("cart.proofUploaded"));
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      // تفريغ قيمة حقل الملف للسماح بإعادة رفع الملف نفسه لاحقًا إن لزم
      if (proofInputRef.current) proofInputRef.current.value = "";
    }
  };

  // إعدادات الحركة عند ظهور تفاصيل التحويل؛ تُبسَّط إذا فعّل المستخدم تقليل الحركة
  const initial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 };
  const animate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8">
      <header className="mb-6">
        <p className="font-display text-[10px] tracking-[0.32em] text-warm uppercase">
          {t("checkout.steps.payment")}
        </p>
        <h2 className="font-display text-xl sm:text-2xl text-[#323D50] dark:text-[#F5F5F5] mt-1">
          {t("checkout.payment.heading")}
        </h2>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MethodCard
          active={method === "cod"}
          onClick={() => onMethodChange("cod")}
          icon={Banknote}
          label={t("checkout.payment.cod")}
          sub={t("checkout.payment.codSub")}
        />
        <MethodCard
          active={method === "bank_transfer"}
          onClick={() => onMethodChange("bank_transfer")}
          icon={CreditCard}
          label={t("checkout.payment.transfer")}
          sub={t("checkout.payment.transferSub")}
        />
      </div>

      {/* الدفع الإلكتروني عبر Plutu */}
      <div className="mt-6">
        <p className="font-display text-[11px] tracking-[0.3em] uppercase text-warm mb-3">
          {t("checkout.payment.onlineHeading")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLUTU_OPTIONS.map((opt) => (
            <MethodCard
              key={opt.id}
              active={method === opt.id}
              onClick={() => onMethodChange(opt.id)}
              icon={opt.icon}
              label={t(opt.labelKey)}
              sub={t(opt.subKey)}
            />
          ))}
        </div>
      </div>

      {/* تفاصيل التحويل المصرفي تظهر فقط عند اختيار طريقة الدفع "bank_transfer" */}
      <AnimatePresence initial={false}>
        {method === "bank_transfer" && (
          <motion.div
            key="transfer"
            initial={initial}
            animate={animate}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-5 space-y-4"
          >
            {/* Bank details */}
            <div className="rounded-2xl border border-[#323D50]/10 dark:border-white/10 bg-white/40 dark:bg-white/5 p-5 space-y-3">
              <h4 className="font-display text-[11px] tracking-[0.3em] uppercase text-warm">
                {t("cart.bankDetails")}
              </h4>
              <DetailRow
                label={t("cart.accountHolder")}
                value={BANK_DETAILS.accountHolder}
              />
              <DetailRow
                label={t("cart.accountNumber")}
                value={BANK_DETAILS.accountNumber}
                mono
                onCopy={() =>
                  handleCopy(BANK_DETAILS.accountNumber, "account")
                }
                copied={copiedField === "account"}
              />
              <DetailRow
                label={t("cart.iban")}
                value={BANK_DETAILS.iban}
                mono
                onCopy={() => handleCopy(BANK_DETAILS.iban, "iban")}
                copied={copiedField === "iban"}
              />
            </div>

            {/* Proof uploader */}
            <div className="rounded-2xl border border-[#323D50]/10 dark:border-white/10 bg-white/40 dark:bg-white/5 p-5 space-y-3">
              <div>
                <h4 className="font-display text-[11px] tracking-[0.3em] uppercase text-warm">
                  {t("checkout.payment.uploadHeading")}
                </h4>
                <p className="text-xs text-[#6B7B8D] dark:text-white/60 mt-1">
                  {t("checkout.payment.uploadHint")}
                </p>
              </div>
              <input
                ref={proofInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
              {/* إذا رُفع الإيصال نعرض معاينته وخيارات التغيير/الحذف، وإلا نعرض منطقة الرفع */}
              {transferProofUrl ? (
                <div className="flex items-start gap-4">
                  <img
                    src={transferProofUrl}
                    alt="Transfer proof"
                    className="w-24 h-24 rounded-xl object-cover border border-[#323D50]/10 dark:border-white/10"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
                      <Check className="w-4 h-4" />
                      {t("cart.proofUploaded")}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => proofInputRef.current?.click()}
                        disabled={uploading}
                        className="h-8 px-3 text-xs text-warm hover:bg-warm/10 hover:text-warm"
                      >
                        {t("checkout.payment.uploadChange")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTransferProofChange(null)}
                        className="h-8 w-8 p-0 text-[#6B7B8D] dark:text-white/60 hover:bg-red-500/10 hover:text-red-500"
                        aria-label="Remove receipt"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => proofInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full border-2 border-dashed border-warm/30 hover:border-warm/60 rounded-2xl py-8 px-4 flex flex-col items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-warm" />
                      <span className="text-sm text-[#6B7B8D] dark:text-white/60">
                        {t("cart.uploadingProof")}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-warm/15 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-warm" />
                      </div>
                      <span className="font-display text-sm text-[#323D50] dark:text-[#F5F5F5]">
                        {t("cart.uploadProof")}
                      </span>
                      <span className="text-[11px] tracking-widest uppercase text-[#6B7B8D] dark:text-white/50">
                        JPEG · PNG · WebP · 5MB
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/**
 * بطاقة اختيار طريقة دفع: زر بنمط radio يُبرَز عند التفعيل (active)،
 * يحمل أيقونة وعنوانًا ووصفًا فرعيًا.
 */
function MethodCard({
  active,
  onClick,
  icon: Icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof CreditCard;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`min-h-[84px] text-start p-4 rounded-2xl border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-warm/40 ${
        active
          ? "border-warm bg-warm/10 dark:bg-warm/15 glow-warm"
          : "border-[#323D50]/15 dark:border-white/15 hover:border-warm/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            active
              ? "bg-warm text-white"
              : "bg-[#323D50]/5 dark:bg-white/10 text-[#6B7B8D] dark:text-white/60"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`font-display text-sm ${
              active
                ? "text-warm"
                : "text-[#323D50] dark:text-[#F5F5F5]"
            }`}
          >
            {label}
          </p>
          <p className="text-xs text-[#6B7B8D] dark:text-white/60 line-clamp-2 mt-0.5">
            {sub}
          </p>
        </div>
      </div>
    </button>
  );
}

/**
 * صف بيانات بنكية (مثل: اسم صاحب الحساب، رقم الحساب، IBAN) مع زر نسخ اختياري.
 * عند توفّر onCopy يظهر زر نسخ يتحوّل إلى علامة صح عند النسخ (copied).
 */
function DetailRow({
  label,
  value,
  mono,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] tracking-widest uppercase text-[#6B7B8D] dark:text-white/50">
          {label}
        </p>
        <p
          className={`text-sm text-[#323D50] dark:text-[#F5F5F5] truncate ${
            mono ? "font-mono" : "font-display"
          }`}
        >
          {value}
        </p>
      </div>
      {onCopy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          aria-label={`Copy ${label}`}
          className="h-8 w-8 p-0 text-[#6B7B8D] dark:text-white/60 hover:bg-warm/10 hover:text-warm"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
}
