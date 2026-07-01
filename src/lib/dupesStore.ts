/**
 * ===========================================================================
 * dupesStore.ts — read-only bridge from the main Shama store to Sahma Dupes.
 *
 * The dupe fragrances live in the separate Sahma Dupes Supabase project. This
 * module opens a second, read-only client pointed at that project (public anon
 * key) so a Shama product page can show "Dupes available" — the inspired-by
 * versions whose `original_product_id` points back at this perfume.
 * Degrades gracefully (isEnabled=false) when creds are absent.
 * ===========================================================================
 */
import { createClient } from "@supabase/supabase-js";

const DUPES_URL = import.meta.env.VITE_DUPES_SUPABASE_URL as string | undefined;
const DUPES_KEY = import.meta.env.VITE_DUPES_SUPABASE_ANON_KEY as string | undefined;

/** Public URL of the Sahma Dupes storefront (for building product links). */
export const DUPES_STORE_URL = (
  (import.meta.env.VITE_DUPES_STORE_URL as string | undefined) || "https://sahmadupes.ly"
).replace(/\/$/, "");

/** True when the dupes bridge is configured. */
export const dupesStoreEnabled = Boolean(DUPES_URL && DUPES_KEY);

const dupesClient = dupesStoreEnabled
  ? createClient(DUPES_URL as string, DUPES_KEY as string, {
      auth: { persistSession: false, storageKey: "shama-dupes-bridge" },
    })
  : null;

export interface DupeProduct {
  id: string;
  name: string;
  name_ar?: string | null;
  price: number;
  image?: string | null;
  original_price?: number | null;
  accord_match?: number | null;
}

/** Build a link to a product on the Sahma Dupes store. */
export const dupeProductUrl = (id: string) => `${DUPES_STORE_URL}/product/${id}`;

/**
 * Fetch active dupes that are linked to a given Shama product id.
 * Returns [] if the bridge is off or none exist.
 */
export const fetchDupesForProduct = async (
  originalProductId: string
): Promise<DupeProduct[]> => {
  if (!dupesClient || !originalProductId) return [];
  const { data, error } = await dupesClient
    .from("perfumes")
    .select("id, name, name_ar, price, image, original_price, accord_match")
    .eq("original_product_id", originalProductId)
    .eq("is_active", true)
    .order("price", { ascending: true });
  if (error) {
    console.error("dupesStore.fetchDupesForProduct:", error.message);
    return [];
  }
  return (data as DupeProduct[]) ?? [];
};
