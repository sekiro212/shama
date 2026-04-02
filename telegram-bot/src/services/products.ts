import { supabase } from "./supabase";
import {
  CreateProductSchema,
  UpdateProductSchema,
  SearchProductsSchema,
} from "../types";
import type { BotLanguage, ProductDraft, FragranceNotes, OrderItem } from "../types";

// ─── Product type (inferred from DB columns) ───

export interface Product {
  id: string;
  name: string;
  name_ar: string;
  brand: string | null;
  price: number;
  size: string;
  gender: "men" | "women" | "unisex";
  description: string | null;
  description_ar: string | null;
  fragrance_notes: FragranceNotes | null;
  fragrance_notes_ar: FragranceNotes | null;
  stock_quantity: number;
  is_active: boolean;
  has_samples: boolean;
  rating: number | null;
  created_at: string;
}

// ─── Search ───────────────────────────────────

export async function searchProducts(query: string, limit = 5): Promise<Product[]> {
  const parsed = SearchProductsSchema.safeParse({ query });
  if (!parsed.success) throw new Error(`Invalid search query: ${parsed.error.message}`);

  const { data, error } = await supabase
    .from("perfumes")
    .select(
      "id, name, name_ar, brand, price, size, gender, description, description_ar, " +
      "fragrance_notes, fragrance_notes_ar, stock_quantity, is_active, has_samples, rating, created_at"
    )
    .or(`name.ilike.%${query}%,name_ar.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Search failed: ${error.message}`);
  return (data as unknown as Product[]) || [];
}

// ─── Get by ID ────────────────────────────────

export async function getProductById(id: string): Promise<Product> {
  const { data, error } = await supabase
    .from("perfumes")
    .select(
      "id, name, name_ar, brand, price, size, gender, description, description_ar, " +
      "fragrance_notes, fragrance_notes_ar, stock_quantity, is_active, has_samples, rating, created_at"
    )
    .eq("id", id)
    .single();

  if (error || !data) throw new Error(`Product not found: ${id}`);
  return data as unknown as Product;
}

// ─── Get by name (fuzzy) ──────────────────────

export async function getProductByName(name: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("perfumes")
    .select(
      "id, name, name_ar, brand, price, size, gender, description, description_ar, " +
      "fragrance_notes, fragrance_notes_ar, stock_quantity, is_active, has_samples, rating, created_at"
    )
    .or(`name.ilike.%${name}%,name_ar.ilike.%${name}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Name lookup failed: ${error.message}`);
  return (data as unknown as Product | null) ?? null;
}

// ─── Create ───────────────────────────────────

export async function createProduct(draft: ProductDraft): Promise<string> {
  const parsed = CreateProductSchema.safeParse(draft);
  if (!parsed.success) {
    throw new Error(`Invalid product data: ${parsed.error.message}`);
  }

  const { data, error } = await supabase
    .from("perfumes")
    .insert({
      name: draft.name,
      price: draft.price,
      description: draft.description ?? null,
      fragrance_notes: draft.fragrance_notes ?? null,
      name_ar: draft.name_ar || draft.name,
      description_ar: draft.description_ar || draft.description || null,
      fragrance_notes_ar: draft.fragrance_notes_ar ?? draft.fragrance_notes ?? null,
      size: draft.size,
      gender: draft.gender,
      stock_quantity: draft.stock_quantity,
      is_active: true,
      has_samples: draft.has_samples ?? false,
      has_bottle_sizes: false,
      image: "",
      rating: 4.5,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create product: ${error.message}`);
  const perfumeId = data.id as string;

  if (draft.has_samples && draft.samples && draft.samples.length > 0) {
    const { error: sErr } = await supabase.from("perfume_samples").insert(
      draft.samples.map((s) => ({
        perfume_id: perfumeId,
        size: s.size,
        price: s.price,
        stock_quantity: 10,
        is_active: true,
      }))
    );
    if (sErr) throw new Error(`Failed to insert samples: ${sErr.message}`);
  }

  return perfumeId;
}

// ─── Update ───────────────────────────────────

// Allowlist of valid updatable fields
const UPDATABLE_FIELDS = new Set([
  "name", "name_ar", "brand", "price", "description", "description_ar",
  "fragrance_notes", "fragrance_notes_ar", "size", "gender",
  "stock_quantity", "is_active", "has_samples",
]);

export async function updateProduct(id: string, changes: Record<string, unknown>): Promise<void> {
  const parsed = UpdateProductSchema.safeParse({ id, changes });
  if (!parsed.success) {
    throw new Error(`Invalid update input: ${parsed.error.message}`);
  }

  const invalidFields = Object.keys(changes).filter((k) => !UPDATABLE_FIELDS.has(k));
  if (invalidFields.length > 0) {
    throw new Error(`Invalid field(s) for update: ${invalidFields.join(", ")}`);
  }

  const { error } = await supabase.from("perfumes").update(changes).eq("id", id);
  if (error) throw new Error(`Failed to update product ${id}: ${error.message}`);
}

// ─── Delete (cascade) ─────────────────────────

export async function deleteProduct(id: string): Promise<void> {
  await supabase.from("perfume_samples").delete().eq("perfume_id", id);
  await supabase.from("perfume_images").delete().eq("perfume_id", id);
  const { error } = await supabase.from("perfumes").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete product ${id}: ${error.message}`);
}

// ─── Format product for display ───────────────

export function formatProduct(product: Product, lang: BotLanguage): string {
  const isAr = lang === "ar";
  const name = isAr ? (product.name_ar || product.name) : product.name;

  const lines = [
    `<b>${name}</b>`,
    product.brand ? `${isAr ? "العلامة" : "Brand"}: ${product.brand}` : "",
    `${isAr ? "السعر" : "Price"}: <b>${product.price} LYD</b>`,
    `${isAr ? "الحجم" : "Size"}: ${product.size}`,
    `${isAr ? "الجنس" : "Gender"}: ${product.gender}`,
    `${isAr ? "المخزون" : "Stock"}: ${product.stock_quantity} ${isAr ? "قطعة" : "units"}`,
    `${isAr ? "نشط" : "Active"}: ${product.is_active ? "✅" : "❌"}`,
    `${isAr ? "عينات" : "Samples"}: ${product.has_samples ? "✅" : "❌"}`,
  ].filter(Boolean);

  const desc = isAr ? product.description_ar : product.description;
  if (desc) {
    lines.push("");
    lines.push(`${isAr ? "الوصف" : "Description"}: ${desc.slice(0, 120)}...`);
  }

  const notes = isAr ? product.fragrance_notes_ar : product.fragrance_notes;
  if (notes?.top?.length) {
    lines.push("");
    lines.push(`🌿 ${isAr ? "المقدمة" : "Top"}: ${notes.top.join(", ")}`);
    if (notes.middle?.length) lines.push(`🌸 ${isAr ? "القلب" : "Heart"}: ${notes.middle.join(", ")}`);
    if (notes.base?.length) lines.push(`🌰 ${isAr ? "القاعدة" : "Base"}: ${notes.base.join(", ")}`);
  }

  return lines.join("\n");
}

// ─── Format update diff ───────────────────────

export function formatUpdateDiff(
  before: Product,
  changes: Record<string, unknown>,
  lang: BotLanguage
): string {
  const isAr = lang === "ar";
  const lines = [`<b>${isAr ? "التغييرات المقترحة" : "Proposed Changes"}:</b>\n`];

  for (const [key, newVal] of Object.entries(changes)) {
    const oldVal = (before as unknown as Record<string, unknown>)[key];
    const label = key.replace(/_/g, " ");
    lines.push(`• <b>${label}</b>: ${oldVal ?? "—"} → <b>${String(newVal)}</b>`);
  }

  return lines.join("\n");
}
