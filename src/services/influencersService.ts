/**
 * influencersService.ts
 * ---------------------
 * طبقة الخدمة الخاصة بالمشاهير (جدول `influencers`) وعمولاتهم. تتولّى:
 *  - عمليات CRUD للمسؤول على المشاهير
 *  - قراءة العروض المجمّعة (`influencer_account_summary` و`influencer_code_stats`)
 *  - سجلّ الدفعات (`influencer_payouts`)
 *
 * ملاحظة: مبلغ العمولة لا يُخزَّن في أي مكان — تحسبه العروض من
 * (subtotal - discount_amount) × النسبة المُلتقطة على الطلب. ونسبة العمولة على
 * الطلب يكتبها trigger في قاعدة البيانات، لا العميل.
 *
 * ملاحظة حول الأخطاء: كل دوال القراءة والكتابة هنا تُسجّل الخطأ عبر
 * console.error ثم تَرمي (throw) بدل إرجاع [] / 0 صامتة. هذه شاشة أرصدة
 * مالية — إخفاء فشل القراءة خلف قيمة فارغة يجعل المسؤول يظنّ أن لا شيء
 * مستحَق بينما القراءة فشلت فعليًا. على كل مستدعٍ أن يلتقط الرمي ويعرض
 * خطأ واضحًا للمستخدم بدل الاعتماد على قيمة افتراضية.
 */
import { supabase } from "@/lib/supabase";
import { adminSelect, adminInsert, adminUpdate, adminDelete } from "./adminDb";

export interface Influencer {
  id: string;
  name: string;
  phone: string | null;
  instagram_handle: string | null;
  notes: string | null;
  default_commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InfluencerPayload {
  name: string;
  phone: string | null;
  instagram_handle: string | null;
  notes: string | null;
  default_commission_rate: number;
  is_active: boolean;
}

/** صف واحد لكل مشهور من العرض `influencer_account_summary`. */
export interface InfluencerAccountSummary {
  influencer_id: string;
  name: string;
  is_active: boolean;
  codes_count: number;
  orders_count: number;
  gross_sales: number;
  commission_earned: number;
  total_paid: number;
  balance_due: number;
}

/**
 * صف لكل (كود، نسبة عمولة) من العرض `influencer_code_stats`.
 * تغيير نسبة الكود أثناء الحملة يُنتج صفّين لنفس الكود، لكل واحد مجموعه.
 */
export interface InfluencerCodeStat {
  influencer_id: string;
  code: string;
  commission_rate: number;
  orders_count: number;
  gross_sales: number;
  commission_due: number;
}

export interface InfluencerPayout {
  id: string;
  influencer_id: string;
  amount: number;
  paid_at: string;
  method: string | null;
  note: string | null;
  created_at: string;
}

export interface InfluencerPayoutPayload {
  influencer_id: string;
  amount: number;
  method: string | null;
  note: string | null;
}

// تعود أعمدة DECIMAL أحيانًا كنصوص حسب المشغّل؛ نطبّعها إلى أرقام قبل الاستخدام.
// الصفر الصامت في حقل مبلغ مستحَق يُقرأ كـ"لا شيء مستحق"، وهو فشل أسوأ من خطأ ظاهر.
function num(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    console.warn(`influencersService: non-numeric value for ${field}:`, value);
    return 0;
  }
  return n;
}

function hydrateInfluencer(row: Record<string, unknown>): Influencer {
  return {
    ...(row as unknown as Influencer),
    default_commission_rate: num(row.default_commission_rate, "default_commission_rate"),
  };
}

function hydrateSummary(
  row: Record<string, unknown>
): InfluencerAccountSummary {
  return {
    ...(row as unknown as InfluencerAccountSummary),
    codes_count: num(row.codes_count, "codes_count"),
    orders_count: num(row.orders_count, "orders_count"),
    gross_sales: num(row.gross_sales, "gross_sales"),
    commission_earned: num(row.commission_earned, "commission_earned"),
    total_paid: num(row.total_paid, "total_paid"),
    balance_due: num(row.balance_due, "balance_due"),
  };
}

function hydrateCodeStat(row: Record<string, unknown>): InfluencerCodeStat {
  return {
    ...(row as unknown as InfluencerCodeStat),
    commission_rate: num(row.commission_rate, "commission_rate"),
    orders_count: num(row.orders_count, "orders_count"),
    gross_sales: num(row.gross_sales, "gross_sales"),
    commission_due: num(row.commission_due, "commission_due"),
  };
}

function hydratePayout(row: Record<string, unknown>): InfluencerPayout {
  return {
    ...(row as unknown as InfluencerPayout),
    amount: num(row.amount, "amount"),
  };
}

/** جميع المشاهير مرتّبين بالاسم. يَرمي عند الفشل بعد تسجيل الخطأ. */
export async function fetchInfluencers(): Promise<Influencer[]> {
  try {
    const { data, error } = await supabase
      .from("influencers")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return (data || []).map(hydrateInfluencer);
  } catch (error) {
    console.error("Error fetching influencers:", error);
    throw error;
  }
}

/** السطر النهائي لكل مشهور: طلبات، مبيعات، عمولة، مدفوع، متبقٍ. يَرمي عند الفشل. */
export async function fetchInfluencerSummaries(): Promise<
  InfluencerAccountSummary[]
> {
  try {
    // عبر admin-db: هذا العرض security_invoker ويقرأ جدول الطلبات، وقد توقّف
    // عن إرجاع أي شيء للمتصفّح بعد إغلاق قراءة الطلبات عليه.
    const data = await adminSelect<Record<string, unknown>>(
      "influencer_account_summary",
      { orderBy: "balance_due", ascending: false },
    );
    return data.map(hydrateSummary);
  } catch (error) {
    console.error("Error fetching influencer summaries:", error);
    throw error;
  }
}

/** تفصيل الأكواد لمشهور واحد. يَرمي عند الفشل. */
export async function fetchInfluencerCodeStats(
  influencerId: string
): Promise<InfluencerCodeStat[]> {
  try {
    const data = await adminSelect<Record<string, unknown>>(
      "influencer_code_stats",
      {
        filters: { influencer_id: influencerId },
        orderBy: "commission_due",
        ascending: false,
      },
    );
    return data.map(hydrateCodeStat);
  } catch (error) {
    console.error("Error fetching influencer code stats:", error);
    throw error;
  }
}

/** سجلّ دفعات مشهور واحد، الأحدث أولًا. يَرمي عند الفشل. */
export async function fetchInfluencerPayouts(
  influencerId: string
): Promise<InfluencerPayout[]> {
  try {
    const { data, error } = await supabase
      .from("influencer_payouts")
      .select("*")
      .eq("influencer_id", influencerId)
      .order("paid_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(hydratePayout);
  } catch (error) {
    console.error("Error fetching influencer payouts:", error);
    throw error;
  }
}

/** إنشاء مشهور جديد. يرمي عند فشل قاعدة البيانات. */
export async function createInfluencer(
  payload: InfluencerPayload
): Promise<Influencer> {
  // عبر admin-db: سياسات "Public insert/update/delete influencers" كانت
  // USING (true)، أي أنّ أي زائر كان يستطيع إنشاء مشهور أو تغيير نسبته.
  const [row] = await adminInsert("influencers", payload as unknown as Record<string, unknown>);
  return hydrateInfluencer(row);
}

/** تحديث جزئي لمشهور. */
export async function updateInfluencer(
  id: string,
  patch: Partial<InfluencerPayload>
): Promise<void> {
  await adminUpdate("influencers", patch as unknown as Record<string, unknown>, { id });
}

/**
 * حذف مشهور. أكواده تصير influencer_id = NULL (ON DELETE SET NULL)،
 * ودفعاته تُحذف معه (ON DELETE CASCADE)، والطلبات السابقة تحتفظ
 * بلقطة النسبة المسجّلة عليها.
 */
export async function deleteInfluencer(id: string): Promise<void> {
  await adminDelete("influencers", { id });
}

/** عدد الأكواد المرتبطة بمشهور — يُستخدم في نص تأكيد الحذف. يَرمي عند الفشل. */
export async function countCodesForInfluencer(
  influencerId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("promo_codes")
      .select("id", { count: "exact", head: true })
      .eq("influencer_id", influencerId);

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error("Error counting influencer codes:", error);
    throw error;
  }
}

/** تسجيل دفعة لمشهور. المبلغ يجب أن يكون > 0 (يفرضه قيد CHECK كذلك). */
export async function recordInfluencerPayout(
  payload: InfluencerPayoutPayload
): Promise<void> {
  await adminInsert("influencer_payouts", payload as unknown as Record<string, unknown>);
}
