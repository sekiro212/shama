/**
 * ===================================================================
 * PlutuOtpDialog — نافذة الدفع برمز OTP لبوابات Plutu (أدفلي/سداد).
 * -------------------------------------------------------------------
 * خطوتان: (1) إدخال رقم الهاتف (وسنة الميلاد لسداد) وإرسال الرمز،
 * (2) إدخال الرمز وتأكيد الدفع. عند النجاح تُستدعى onPaid(transactionId).
 * المبلغ لا يُرسَل من هنا — تقرؤه الدالة الطرفية من سجل الطلب.
 * يدعم العربية والإنجليزية.
 * ===================================================================
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  otpVerify,
  otpConfirm,
  type PlutuGateway,
} from "@/services/plutuService";

interface PlutuOtpDialogProps {
  open: boolean;
  orderId: string;
  gateway: PlutuGateway; // "edfali" | "sadadapi"
  onPaid: (transactionId: string) => void;
  onClose: () => void;
}

// أنماط أرقام الهاتف لكل بوابة (مطابقة لقواعد التحقق في Plutu)
const MOBILE_PATTERN: Record<string, RegExp> = {
  edfali: /^09[1-6][0-9]{7}$/,
  sadadapi: /^09[13][0-9]{7}$/,
};

export default function PlutuOtpDialog({
  open,
  orderId,
  gateway,
  onPaid,
  onClose,
}: PlutuOtpDialogProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<1 | 2>(1);
  const [mobile, setMobile] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [code, setCode] = useState("");
  const [processId, setProcessId] = useState("");
  const [busy, setBusy] = useState(false);

  const isSadad = gateway === "sadadapi";

  // إعادة ضبط الحالة عند فتح/إغلاق النافذة لتفادي تسرّب بيانات بين المحاولات
  useEffect(() => {
    if (open) {
      setStep(1);
      setMobile("");
      setBirthYear("");
      setCode("");
      setProcessId("");
      setBusy(false);
    }
  }, [open, gateway]);

  const handleSend = async () => {
    if (!MOBILE_PATTERN[gateway].test(mobile)) {
      toast.error(t("checkout.plutu.invalidMobile"));
      return;
    }
    if (isSadad && !/^\d{4}$/.test(birthYear)) {
      toast.error(t("checkout.plutu.invalidBirthYear"));
      return;
    }
    setBusy(true);
    try {
      const { process_id } = await otpVerify({
        orderId,
        gateway,
        mobileNumber: mobile,
        birthYear: isSadad ? birthYear : undefined,
      });
      setProcessId(process_id);
      setStep(2);
      toast.success(t("checkout.plutu.otpSent"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("checkout.plutu.sendFailed"),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!code.trim()) {
      toast.error(t("checkout.plutu.enterCode"));
      return;
    }
    setBusy(true);
    try {
      const { transaction_id } = await otpConfirm({
        orderId,
        gateway,
        processId,
        code: code.trim(),
      });
      onPaid(transaction_id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("checkout.plutu.confirmFailed"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {t(`checkout.payment.${isSadad ? "sadad" : "edfali"}`)}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? t("checkout.plutu.step1Hint")
              : t("checkout.plutu.step2Hint")}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="plutu-mobile">
                {t("checkout.plutu.mobileLabel")}
              </Label>
              <Input
                id="plutu-mobile"
                inputMode="numeric"
                placeholder="09XXXXXXXX"
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                dir="ltr"
              />
            </div>
            {isSadad && (
              <div className="space-y-1.5">
                <Label htmlFor="plutu-birth">
                  {t("checkout.plutu.birthYearLabel")}
                </Label>
                <Input
                  id="plutu-birth"
                  inputMode="numeric"
                  placeholder="1990"
                  value={birthYear}
                  onChange={(e) =>
                    setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  dir="ltr"
                />
              </div>
            )}
            <LoadingButton
              onClick={handleSend}
              loading={busy}
              loadingText={t("checkout.plutu.sending")}
              className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl h-12"
            >
              {t("checkout.plutu.sendOtp")}
            </LoadingButton>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="plutu-code">
                {t("checkout.plutu.codeLabel")}
              </Label>
              <Input
                id="plutu-code"
                inputMode="numeric"
                placeholder="------"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
                dir="ltr"
                className="text-center tracking-[0.4em] text-lg"
              />
            </div>
            <LoadingButton
              onClick={handleConfirm}
              loading={busy}
              loadingText={t("checkout.plutu.confirming")}
              className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl h-12"
            >
              {t("checkout.plutu.confirmPay")}
            </LoadingButton>
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={busy}
              className="w-full text-xs text-[#6B7B8D] dark:text-white/60 hover:text-warm transition-colors"
            >
              {t("checkout.plutu.resend")}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
