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

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isPromoExpired(
  promo: Pick<PromoCode, "expires_at">
): boolean {
  return (
    !!promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()
  );
}

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
    if (error.code === "23505") throw new Error("DUPLICATE_CODE");
    throw error;
  }
  return hydratePromo(data);
}

export async function updatePromoCode(
  id: string,
  patch: Partial<PromoCodePayload>
): Promise<void> {
  const { error } = await supabase
    .from("promo_codes")
    .update({
      ...patch,
      ...(patch.code !== undefined ? { code: normalizeCode(patch.code) } : {}),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deletePromoCode(id: string): Promise<void> {
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) throw error;
}

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

async function fetchPerUserUsageCount(
  promoId: string,
  userEmail: string
): Promise<number> {
  if (!userEmail) return 0;
  try {
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

export async function validatePromoCode(
  code: string,
  items: PromoCartItem[],
  userEmail: string
): Promise<PromoValidationResult> {
  const subtotal = round2(
    items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  );

  const emptyResult: PromoValidationResult = {
    valid: false,
    subtotal,
    eligibleSubtotal: 0,
    discount: 0,
    finalTotal: subtotal,
  };

  const normalized = normalizeCode(code);
  if (!normalized) return { ...emptyResult, error: "INVALID_CODE" };

  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  if (error || !data) {
    return { ...emptyResult, error: "INVALID_CODE" };
  }

  const promo = hydratePromo(data);

  if (!promo.is_active) {
    return { ...emptyResult, error: "INACTIVE", promo };
  }

  if (isPromoExpired(promo)) {
    return { ...emptyResult, error: "EXPIRED", promo };
  }

  if (promo.usage_limit !== null && promo.usage_count >= promo.usage_limit) {
    return { ...emptyResult, error: "USAGE_LIMIT_REACHED", promo };
  }

  if (promo.usage_limit_per_user !== null && userEmail) {
    const used = await fetchPerUserUsageCount(promo.id, userEmail);
    if (used >= promo.usage_limit_per_user) {
      return { ...emptyResult, error: "PER_USER_LIMIT_REACHED", promo };
    }
  }

  const eligibleItems =
    promo.scope === "specific_products"
      ? items.filter((i) => promo.scope_product_ids.includes(i.id))
      : items;

  const eligibleSubtotal = round2(
    eligibleItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  );

  if (promo.scope === "specific_products" && eligibleSubtotal <= 0) {
    return {
      ...emptyResult,
      eligibleSubtotal,
      error: "NOT_APPLICABLE",
      promo,
    };
  }

  if (eligibleSubtotal < promo.min_order_total) {
    return {
      ...emptyResult,
      eligibleSubtotal,
      error: "BELOW_MIN_ORDER",
      errorContext: { minOrder: promo.min_order_total },
      promo,
    };
  }

  let rawDiscount: number;
  if (promo.discount_type === "fixed") {
    rawDiscount = Math.min(promo.discount_value, eligibleSubtotal);
  } else {
    const pct = (eligibleSubtotal * promo.discount_value) / 100;
    const cap = promo.max_discount ?? Number.POSITIVE_INFINITY;
    rawDiscount = Math.min(pct, cap, eligibleSubtotal);
  }

  const discount = round2(Math.max(0, rawDiscount));
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
