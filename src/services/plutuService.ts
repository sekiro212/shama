/**
 * ===================================================================
 * plutuService — واجهة الواجهة الأمامية لمدفوعات Plutu.
 * -------------------------------------------------------------------
 * يستدعي دوال Supabase Edge (plutu-payment / plutu-callback) فقط؛
 * مفاتيح Plutu السرّية لا تصل المتصفّح أبدًا. المبلغ يُقرأ من سجل
 * الطلب داخل الدالة الطرفية (server-side) ولا يُرسَل من العميل.
 * ===================================================================
 */
import { supabase } from "@/lib/supabase";

// معرّفات بوابات Plutu (تطابق قيمة طريقة الدفع لبوابات Plutu)
export type PlutuGateway =
  | "edfali"
  | "sadadapi"
  | "localbankcards"
  | "tlync"
  | "mpgs";

export const PLUTU_OTP_GATEWAYS: PlutuGateway[] = ["edfali", "sadadapi"];
export const PLUTU_CARD_GATEWAYS: PlutuGateway[] = [
  "localbankcards",
  "tlync",
  "mpgs",
];

export const isPlutuGateway = (m: string): m is PlutuGateway =>
  (PLUTU_OTP_GATEWAYS as string[]).includes(m) ||
  (PLUTU_CARD_GATEWAYS as string[]).includes(m);

export const isOtpGateway = (m: string): m is PlutuGateway =>
  (PLUTU_OTP_GATEWAYS as string[]).includes(m);

interface InvokeError {
  error: string;
  status?: number;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("plutu-payment", {
    body,
  });
  if (error) {
    // عند رجوع كود غير 2xx يضع supabase-js الاستجابة في error.context (Response)؛
    // نقرأ جسمها لاستخراج رسالة Plutu الفعلية بدل "non-2xx status code" العامة
    let detail: string | undefined;
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try {
        const body = await ctx.clone().json();
        detail = (body as InvokeError)?.error;
      } catch {
        /* ignore parse errors */
      }
    }
    throw new Error(
      detail ??
        (data as InvokeError | null)?.error ??
        error.message ??
        "Payment request failed",
    );
  }
  if (data && (data as InvokeError).error) {
    throw new Error((data as InvokeError).error);
  }
  return data as T;
}

/** الخطوة 1 لبوابات OTP (أدفلي/سداد): إرسال رمز التحقق إلى هاتف العميل. */
export async function otpVerify(args: {
  orderId: string;
  gateway: PlutuGateway;
  mobileNumber: string;
  birthYear?: string;
}): Promise<{ process_id: string }> {
  return invoke({
    action: "otp_verify",
    orderId: args.orderId,
    gateway: args.gateway,
    mobile_number: args.mobileNumber,
    birth_year: args.birthYear,
  });
}

/** الخطوة 2 لبوابات OTP: تأكيد الدفع بالرمز؛ تُعلّم الطلب مدفوعًا عند النجاح. */
export async function otpConfirm(args: {
  orderId: string;
  gateway: PlutuGateway;
  processId: string;
  code: string;
}): Promise<{ paid: boolean; transaction_id: string }> {
  return invoke({
    action: "otp_confirm",
    orderId: args.orderId,
    gateway: args.gateway,
    process_id: args.processId,
    code: args.code,
  });
}

/** بوابات البطاقة/التحويل: تبدأ الدفع وتعيد رابط التحويل لإعادة توجيه المتصفّح. */
export async function cardInitiate(args: {
  orderId: string;
  gateway: PlutuGateway;
  lang: "ar" | "en";
  mobileNumber?: string;
}): Promise<{ redirect_url: string }> {
  return invoke({
    action: "card_initiate",
    orderId: args.orderId,
    gateway: args.gateway,
    lang: args.lang,
    mobile_number: args.mobileNumber,
  });
}

/**
 * يُمرّر معاملات العودة الموقّعة (query string) من صفحة نجاح الطلب إلى الدالة
 * الطرفية للتحقّق من التوقيع (HMAC) وتعليم الطلب مدفوعًا — لبوابات البطاقة التي
 * تعود إلى المتصفّح فقط (localbankcards/mpgs).
 */
export async function verifyCardReturn(
  rawQuery: string,
): Promise<{ paid: boolean; orderId?: string; status?: string }> {
  const clean = rawQuery.replace(/^\?/, "");
  const { data, error } = await supabase.functions.invoke("plutu-callback", {
    body: { rawQuery: clean },
  });
  if (error) {
    return { paid: false, status: "failed" };
  }
  return data as { paid: boolean; orderId?: string; status?: string };
}
