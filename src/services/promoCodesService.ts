/**
 * promoCodesService.ts
 * --------------------
 * طبقة الخدمة الخاصة بأكواد الخصم/العروض (جدول `promo_codes`). تتولّى:
 *  - عمليات CRUD للمسؤول (عرض، إنشاء، تحديث، حذف، تبديل التفعيل)
 *  - التحقّق الموجّه للعميل من الكود مقابل سلة الشراء (المنطق الأساسي في
 *    `validatePromoCode`)، مع حساب الخصم الفعلي والإجمالي النهائي
 *  - زيادة عدّاد الاستخدام بأمان دون تجاوز الحدود المُهيّأة
 *
 * نموذج الخصم:
 *  - `discount_type`: "fixed" (مبلغ ثابت مخصوم) أو "percentage" (نسبة مئوية، مع حدّ أقصى اختياري عبر `max_discount`)
 *  - `scope`: "all_products" أو "specific_products" (المنتجات المُدرجة فقط مؤهَّلة)
 *  - الحدود: حدّ عام `usage_limit`، إضافة إلى `usage_limit_per_user` (يُحسب عبر البريد الإلكتروني للطلبات السابقة)
 */
import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/contexts/CartContext";

export type DiscountType = "fixed" | "percentage";
export type PromoScope = "all_products" | "specific_products";

export interface PromoCode {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount: number | null;
  min_order_total: number;
  scope: PromoScope;
  scope_product_ids: string[];
  is_active: boolean;
  expires_at: string | null;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface PromoCodePayload {
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount: number | null;
  min_order_total: number;
  scope: PromoScope;
  scope_product_ids: string[];
  is_active: boolean;
  expires_at: string | null;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
}

export type PromoValidationError =
  | "INVALID_CODE"
  | "INACTIVE"
  | "EXPIRED"
  | "USAGE_LIMIT_REACHED"
  | "PER_USER_LIMIT_REACHED"
  | "BELOW_MIN_ORDER"
  | "NOT_APPLICABLE";

export type PromoCartItem = Pick<CartItem, "id" | "price" | "quantity">;

export interface PromoValidationResult {
  valid: boolean;
  error?: PromoValidationError;
  errorContext?: { minOrder?: number };
  promo?: PromoCode;
  subtotal: number;
  eligibleSubtotal: number;
  discount: number;
  finalTotal: number;
}

// تُخزَّن الأكواد وتُقارَن بأحرف كبيرة وبعد إزالة الفراغات حتى يساوي "  save10 " قيمة "SAVE10".
function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

// التقريب إلى منزلتين عشريتين لتجنّب أخطاء الأرقام العائمة في المبالغ (مثل 0.1+0.2).
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * تُرجع true إذا كان للعرض تاريخ انتهاء أصبح الآن في الماضي.
 * @param promo كائن يحتوي على الأقل `expires_at` (القيمة null تعني لا ينتهي أبدًا).
 */
export function isPromoExpired(
  promo: Pick<PromoCode, "expires_at">
): boolean {
  return (
    !!promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()
  );
}

// قد تصل scope_product_ids كمصفوفة حقيقية أو كنص JSON (حسب طريقة كتابة العمود)؛
// نُطبّعها في الحالتين إلى string[]. وأي شيء آخر => [].
function parseScopeIds(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// تحويل حقول الصف الخام من قاعدة البيانات إلى أنواعها الصحيحة وقت التشغيل (تعود
// الأرقام كنصوص من بعض المُشغّلات، ومُعرّفات النطاق تحتاج تحليلًا) قبل استخدامها.
function hydratePromo(row: Record<string, unknown>): PromoCode {
  return {
    ...(row as unknown as PromoCode),
    discount_value: Number(row.discount_value),
    max_discount:
      row.max_discount !== null && row.max_discount !== undefined
        ? Number(row.max_discount)
        : null,
    min_order_total: Number(row.min_order_total ?? 0),
    scope_product_ids: parseScopeIds(row.scope_product_ids),
  };
}

/**
 * للمسؤول: يجلب كل أكواد العروض، الأحدث أولًا.
 * @returns أكواد العروض بعد التطبيع؛ [] عند حدوث خطأ.
 */
export async function fetchAllPromoCodes(): Promise<PromoCode[]> {
  try {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching promo codes:", error);
      return [];
    }
    return (data || []).map(hydratePromo);
  } catch (error) {
    console.error("Error fetching promo codes:", error);
    return [];
  }
}

/**
 * للمسؤول: يُنشئ كود عرض جديدًا (يُخزَّن الكود بعد التطبيع/التحويل لأحرف كبيرة).
 * @param payload تعريف العرض الكامل.
 * @returns كود العرض المُنشأ بعد التطبيع.
 * @throws Error("DUPLICATE_CODE") إن كان الكود موجودًا مسبقًا؛ ويُعيد رمي الأخطاء الأخرى.
 */
export async function createPromoCode(
  payload: PromoCodePayload
): Promise<PromoCode> {
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      ...payload,
      code: normalizeCode(payload.code),
    })
    .select()
    .single();

  if (error) {
    // رمز Postgres 23505 = انتهاك قيد الفرادة → الكود `code` موجود مسبقًا.
    if (error.code === "23505") throw new Error("DUPLICATE_CODE");
    throw error;
  }
  return hydratePromo(data);
}

/**
 * للمسؤول: يُحدّث كود عرض تحديثًا جزئيًا.
 * @param id    مُعرّف العرض المراد تحديثه.
 * @param patch مجموعة فرعية من الحقول المراد تغييرها.
 * يُعيد تطبيع `code` فقط عندما يكون جزءًا من التعديل (حتى لا تمسّ تعديلات الحقول
 * الأخرى الكود المُخزَّن). يرمي خطأ عند فشل قاعدة البيانات.
 */
export async function updatePromoCode(
  id: string,
  patch: Partial<PromoCodePayload>
): Promise<void> {
  const { error } = await supabase
    .from("promo_codes")
    .update({
      ...patch,
      // إعادة تطبيع الكود بشكل شرطي فقط إذا كان المُستدعي يُغيّره.
      ...(patch.code !== undefined ? { code: normalizeCode(patch.code) } : {}),
    })
    .eq("id", id);

  if (error) throw error;
}

/** للمسؤول: يحذف كود عرض نهائيًا. يرمي خطأ عند فشل قاعدة البيانات. */
export async function deletePromoCode(id: string): Promise<void> {
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) throw error;
}

/**
 * للمسؤول: يُفعّل/يُعطّل كود عرض دون حذفه.
 * @param isActive حالة التفعيل الجديدة.
 */
export async function togglePromoCode(
  id: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from("promo_codes")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

// يحسب كم طلبًا سابقًا قدّمه هذا البريد الإلكتروني مستخدمًا هذا العرض، لفرض حدّ
// الاستخدام لكل مستخدم. يُرجع Infinity عند الفشل (انظر أدناه).
async function fetchPerUserUsageCount(
  promoId: string,
  userEmail: string
): Promise<number> {
  if (!userEmail) return 0;
  try {
    // عدّ بـ head+exact للطلبات المطابقة فقط — لا حاجة لبيانات الصفوف.
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("email", userEmail)
      .eq("promo_code_id", promoId);
    if (error) {
      // Fail closed — if we can't confirm usage, treat as at-limit to
      // prevent bypassing the per-user limit during transient failures.
      console.error("Error fetching per-user usage count:", error);
      return Number.POSITIVE_INFINITY;
    }
    return count || 0;
  } catch (err) {
    console.error("Error fetching per-user usage count:", err);
    return Number.POSITIVE_INFINITY;
  }
}

/**
 * يتحقّق من كود عرض مقابل سلة الشراء ويحسب الخصم الناتج.
 * يُجري الفحوصات بالترتيب — الوجود ← مُفعّل ← غير منتهٍ ← الحدّ العام ←
 * الحدّ لكل مستخدم ← نطاق المنتجات ← الحدّ الأدنى للطلب ← حساب الخصم — ويُرجع
 * أول فشل كـ `error` ذي نوع، أو نتيجة `valid: true` مع الإجماليات.
 * @param code      الكود الخام كما كتبه المستخدم (يُطبَّع داخليًا).
 * @param items     عناصر السلة (id، price، quantity).
 * @param userEmail بريد المشتري، يُستخدم لحدّ الاستخدام لكل مستخدم.
 * @returns كائن `PromoValidationResult` يحتوي subtotal وeligibleSubtotal وdiscount وfinalTotal.
 */
export async function validatePromoCode(
  code: string,
  items: PromoCartItem[],
  userEmail: string
): Promise<PromoValidationResult> {
  // مجموع السلة الكامل (كل العناصر)، بغضّ النظر عن العناصر التي يغطّيها العرض.
  const subtotal = round2(
    items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  );

  // النتيجة المبدئية "لم يُطبَّق خصم"، تُنشر في كل خروج مبكّر.
  const emptyResult: PromoValidationResult = {
    valid: false,
    subtotal,
    eligibleSubtotal: 0,
    discount: 0,
    finalTotal: subtotal,
  };

  const normalized = normalizeCode(code);
  if (!normalized) return { ...emptyResult, error: "INVALID_CODE" };

  // تُرجع maybeSingle() القيمة null (وليس خطأ) عندما لا يطابق أي كود.
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  if (error || !data) {
    return { ...emptyResult, error: "INVALID_CODE" };
  }

  const promo = hydratePromo(data);

  // البوّابة 1: الكود مُعطَّل من قِبل المسؤول.
  if (!promo.is_active) {
    return { ...emptyResult, error: "INACTIVE", promo };
  }

  // البوّابة 2: تجاوز تاريخ الانتهاء.
  if (isPromoExpired(promo)) {
    return { ...emptyResult, error: "EXPIRED", promo };
  }

  // البوّابة 3: بلوغ الحدّ العام للاستخدام (الحدّ null يعني غير محدود).
  if (promo.usage_limit !== null && promo.usage_count >= promo.usage_limit) {
    return { ...emptyResult, error: "USAGE_LIMIT_REACHED", promo };
  }

  // البوّابة 4: هذا المشتري استخدم الكود بالفعل بالعدد المسموح به.
  if (promo.usage_limit_per_user !== null && userEmail) {
    const used = await fetchPerUserUsageCount(promo.id, userEmail);
    if (used >= promo.usage_limit_per_user) {
      return { ...emptyResult, error: "PER_USER_LIMIT_REACHED", promo };
    }
  }

  // في نطاق "specific_products" نَعُدّ فقط عناصر السلة التي يوجد مُعرّفها في قائمة
  // السماح الخاصة بالعرض؛ أما نطاق "all_products" فيَعُدّ السلة كاملة.
  const eligibleItems =
    promo.scope === "specific_products"
      ? items.filter((i) => promo.scope_product_ids.includes(i.id))
      : items;

  // مجموع العناصر المؤهَّلة للخصم فقط (أساس احتساب الخصم).
  const eligibleSubtotal = round2(
    eligibleItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  );

  // البوّابة 5: عرض مُقيّد بنطاق لكن لا يتأهّل أيّ من عناصر السلة.
  if (promo.scope === "specific_products" && eligibleSubtotal <= 0) {
    return {
      ...emptyResult,
      eligibleSubtotal,
      error: "NOT_APPLICABLE",
      promo,
    };
  }

  // البوّابة 6: الإنفاق المؤهَّل أقل من عتبة الحدّ الأدنى للطلب الخاصة بالكود.
  if (eligibleSubtotal < promo.min_order_total) {
    return {
      ...emptyResult,
      eligibleSubtotal,
      error: "BELOW_MIN_ORDER",
      errorContext: { minOrder: promo.min_order_total },
      promo,
    };
  }

  // حساب الخصم: مُقيّد بحيث لا يتجاوز أبدًا مجموع العناصر المؤهَّلة.
  let rawDiscount: number;
  if (promo.discount_type === "fixed") {
    // مبلغ ثابت مخصوم، لكن لا يزيد أبدًا عن تكلفة العناصر المؤهَّلة.
    rawDiscount = Math.min(promo.discount_value, eligibleSubtotal);
  } else {
    // نسبة مئوية من المجموع المؤهَّل، مُقيّدة بـ max_discount (إن وُجد) ثم بمجموع
    // العناصر المؤهَّلة نفسه.
    const pct = (eligibleSubtotal * promo.discount_value) / 100;
    const cap = promo.max_discount ?? Number.POSITIVE_INFINITY;
    rawDiscount = Math.min(pct, cap, eligibleSubtotal);
  }

  const discount = round2(Math.max(0, rawDiscount));
  // يُخصم الخصم من المجموع الكامل (وليس المؤهَّل فقط) للحصول على الإجمالي المُستحق للدفع.
  const finalTotal = round2(Math.max(0, subtotal - discount));

  return {
    valid: true,
    promo,
    subtotal,
    eligibleSubtotal,
    discount,
    finalTotal,
  };
}

/**
 * Atomically-ish increments a promo's usage count after a successful order,
 * without ever pushing it past `usage_limit`.
 * @param id Promo id to increment.
 * @throws Rethrows DB errors; callers typically fire-and-forget and just log.
 */
export async function incrementPromoCodeUsage(id: string): Promise<void> {
  // Re-read current usage_count + usage_limit, then conditionally update so
  // we never exceed the limit even under a race. Best-effort; callers
  // should fire-and-forget and log failures without blocking checkout.
  const { data, error: fetchError } = await supabase
    .from("promo_codes")
    .select("usage_count, usage_limit")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !data) throw fetchError ?? new Error("promo not found");

  const currentCount = Number(data.usage_count ?? 0);
  const limit =
    data.usage_limit !== null && data.usage_limit !== undefined
      ? Number(data.usage_limit)
      : null;

  if (limit !== null && currentCount >= limit) return;

  let query = supabase
    .from("promo_codes")
    .update({ usage_count: currentCount + 1 })
    .eq("id", id)
    .eq("usage_count", currentCount); // optimistic guard against race

  if (limit !== null) {
    query = query.lt("usage_count", limit);
  }

  const { error } = await query;
  if (error) throw error;
}
