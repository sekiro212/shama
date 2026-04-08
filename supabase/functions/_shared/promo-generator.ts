import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function generatePromoCode(
  supabase: SupabaseClient,
  discountPercent: number = 10,
  expiryDays: number = 7
): Promise<{ id: string; code: string } | null> {
  const code = `SHAMA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const expiresAt = new Date(
    Date.now() + expiryDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code,
      discount_type: "percentage",
      discount_value: discountPercent,
      max_discount: null,
      min_order_total: 0,
      scope: "all_products",
      scope_product_ids: [],
      is_active: true,
      expires_at: expiresAt,
      usage_limit: 1,
      usage_limit_per_user: 1,
    })
    .select("id, code")
    .single();

  if (error) {
    console.error("Failed to generate promo code:", error.message);
    return null;
  }

  return data;
}
