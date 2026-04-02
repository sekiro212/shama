import { createClient } from "@supabase/supabase-js";
import { config } from "../config";
import type { ProductDraft } from "../types";

// Use service role key — bypasses RLS for server-side writes
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

export async function createPerfumeProduct(draft: ProductDraft): Promise<string> {
  // Insert main perfume record with bilingual fields
  const { data, error } = await supabase
    .from("perfumes")
    .insert({
      name: draft.name,
      price: draft.price,
      description: draft.description,
      fragrance_notes: draft.fragrance_notes,
      name_ar: draft.name_ar || draft.name,
      description_ar: draft.description_ar || draft.description,
      fragrance_notes_ar: draft.fragrance_notes_ar || draft.fragrance_notes,
      size: draft.size,
      gender: draft.gender,
      stock_quantity: draft.stock_quantity,
      is_active: true,
      has_samples: draft.has_samples,
      has_bottle_sizes: false,
      image: "", // Legacy field — real images go in perfume_images table
      rating: 4.5,
    })
    .select("id")
    .single();

  if (error) throw error;
  const perfumeId = data.id as string;

  // Insert sample variants if provided
  if (draft.has_samples && draft.samples.length > 0) {
    const { error: sErr } = await supabase.from("perfume_samples").insert(
      draft.samples.map((s) => ({
        perfume_id: perfumeId,
        size: s.size,
        price: s.price,
        stock_quantity: 10,
        is_active: true,
      }))
    );
    if (sErr) throw sErr;
  }

  return perfumeId;
}

export async function savePerfumeImage(
  perfumeId: string,
  imageBuffer: Buffer,
  mimeType: string,
  isPrimary: boolean,
  displayOrder: number
): Promise<string> {
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const storagePath = `${perfumeId}/${Date.now()}-${displayOrder}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("perfume-images")
    .upload(storagePath, imageBuffer, { contentType: mimeType, upsert: false });

  if (uploadError) throw uploadError;

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("perfume-images").getPublicUrl(storagePath);

  // Insert metadata row
  const { error: dbError } = await supabase.from("perfume_images").insert({
    perfume_id: perfumeId,
    image_url: publicUrl,
    image_name: `${perfumeId}-${displayOrder}.${ext}`,
    file_path: storagePath,
    file_size: imageBuffer.length,
    mime_type: mimeType,
    is_primary: isPrimary,
    display_order: displayOrder,
  });

  if (dbError) throw dbError;

  // If primary, also update legacy image field
  if (isPrimary) {
    await supabase.from("perfumes").update({ image: publicUrl }).eq("id", perfumeId);
  }

  return publicUrl;
}
