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
 */
import { supabase } from "@/lib/supabase";

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
function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function hydrateInfluencer(row: Record<string, unknown>): Influencer {
  return {
    ...(row as unknown as Influencer),
    default_commission_rate: num(row.default_commission_rate),
  };
}

function hydrateSummary(
  row: Record<string, unknown>
): InfluencerAccountSummary {
  return {
    ...(row as unknown as InfluencerAccountSummary),
    codes_count: num(row.codes_count),
    orders_count: num(row.orders_count),
    gross_sales: num(row.gross_sales),
    commission_earned: num(row.commission_earned),
    total_paid: num(row.total_paid),
    balance_due: num(row.balance_due),
  };
}

function hydrateCodeStat(row: Record<string, unknown>): InfluencerCodeStat {
  return {
    ...(row as unknown as InfluencerCodeStat),
    commission_rate: num(row.commission_rate),
    orders_count: num(row.orders_count),
    gross_sales: num(row.gross_sales),
    commission_due: num(row.commission_due),
  };
}

function hydratePayout(row: Record<string, unknown>): InfluencerPayout {
  return {
    ...(row as unknown as InfluencerPayout),
    amount: num(row.amount),
  };
}

/** جميع المشاهير مرتّبين بالاسم. يُرجع [] عند الفشل بدل الرمي. */
export async function fetchInfluencers(): Promise<Influencer[]> {
  const { data, error } = await supabase
    .from("influencers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching influencers:", error);
    return [];
  }
  return (data || []).map(hydrateInfluencer);
}

/** السطر النهائي لكل مشهور: طلبات، مبيعات، عمولة، مدفوع، متبقٍ. */
export async function fetchInfluencerSummaries(): Promise<
  InfluencerAccountSummary[]
> {
  const { data, error } = await supabase
    .from("influencer_account_summary")
    .select("*")
    .order("balance_due", { ascending: false });

  if (error) {
    console.error("Error fetching influencer summaries:", error);
    return [];
  }
  return (data || []).map(hydrateSummary);
}

/** تفصيل الأكواد لمشهور واحد. */
export async function fetchInfluencerCodeStats(
  influencerId: string
): Promise<InfluencerCodeStat[]> {
  const { data, error } = await supabase
    .from("influencer_code_stats")
    .select("*")
    .eq("influencer_id", influencerId)
    .order("commission_due", { ascending: false });

  if (error) {
    console.error("Error fetching influencer code stats:", error);
    return [];
  }
  return (data || []).map(hydrateCodeStat);
}

/** سجلّ دفعات مشهور واحد، الأحدث أولًا. */
export async function fetchInfluencerPayouts(
  influencerId: string
): Promise<InfluencerPayout[]> {
  const { data, error } = await supabase
    .from("influencer_payouts")
    .select("*")
    .eq("influencer_id", influencerId)
    .order("paid_at", { ascending: false });

  if (error) {
    console.error("Error fetching influencer payouts:", error);
    return [];
  }
  return (data || []).map(hydratePayout);
}

/** إنشاء مشهور جديد. يرمي عند فشل قاعدة البيانات. */
export async function createInfluencer(
  payload: InfluencerPayload
): Promise<Influencer> {
  const { data, error } = await supabase
    .from("influencers")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return hydrateInfluencer(data);
}

/** تحديث جزئي لمشهور. */
export async function updateInfluencer(
  id: string,
  patch: Partial<InfluencerPayload>
): Promise<void> {
  const { error } = await supabase
    .from("influencers")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

/**
 * حذف مشهور. أكواده تصير influencer_id = NULL (ON DELETE SET NULL)،
 * ودفعاته تُحذف معه (ON DELETE CASCADE)، والطلبات السابقة تحتفظ
 * بلقطة النسبة المسجّلة عليها.
 */
export async function deleteInfluencer(id: string): Promise<void> {
  const { error } = await supabase.from("influencers").delete().eq("id", id);
  if (error) throw error;
}

/** عدد الأكواد المرتبطة بمشهور — يُستخدم في نص تأكيد الحذف. */
export async function countCodesForInfluencer(
  influencerId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("promo_codes")
    .select("id", { count: "exact", head: true })
    .eq("influencer_id", influencerId);

  if (error) {
    console.error("Error counting influencer codes:", error);
    return 0;
  }
  return count ?? 0;
}

/** تسجيل دفعة لمشهور. المبلغ يجب أن يكون > 0 (يفرضه قيد CHECK كذلك). */
export async function recordInfluencerPayout(
  payload: InfluencerPayoutPayload
): Promise<void> {
  const { error } = await supabase.from("influencer_payouts").insert(payload);
  if (error) throw error;
}
