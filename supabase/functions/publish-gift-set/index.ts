// publish-gift-set — writes a customer-built gift set to the gift page.
//
// The gift builder used to insert a `perfumes` row straight from the browser.
// That only worked because anyone could insert into the catalogue, which is the
// hole that had to be closed. This is the narrow replacement: it accepts the
// builder's own fields and nothing else, and hard-codes everything that decides
// what the row *is*.
//
// type is forced to "gift" here rather than taken from the caller. If it were
// caller-supplied, this function would be an open "add anything to the
// catalogue" endpoint wearing a different name — the same hole, relocated.
// Price is likewise recomputed from the named perfumes rather than trusted, so
// a caller cannot publish a set that misrepresents its own total.
//
// Only reached when the customer ticks "publish to the gift page"; the gift
// order itself is stored separately and does not depend on this succeeding.
//
// Deploy:  supabase functions deploy publish-gift-set
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.slice(0, max) : "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let p: Record<string, unknown>;
  try {
    p = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const perfumeIds = Array.isArray(p.perfumeIds)
    ? p.perfumeIds.filter((x) => typeof x === "string").slice(0, 12)
    : [];
  if (perfumeIds.length === 0) {
    return json({ error: "perfumeIds is required" }, 400);
  }

  const supabase = getServiceClient();

  // Price and gender come from the real rows, never from the request body.
  const { data: chosen, error: lookupErr } = await supabase
    .from("perfumes")
    .select("id, price, gender")
    .in("id", perfumeIds);

  if (lookupErr) {
    console.error("publish-gift-set: lookup failed", lookupErr.message);
    return json({ error: "Lookup failed" }, 500);
  }
  if (!chosen || chosen.length === 0) {
    return json({ error: "No such perfumes" }, 400);
  }

  const totalPrice = chosen.reduce((s, c) => s + Number(c.price ?? 0), 0);
  const genders = [...new Set(chosen.map((c) => c.gender || "unisex"))];
  const gender = genders.length === 1 ? genders[0] : "unisex";

  const image = str(p.image, 500) || null;
  const notes = (p.notes ?? { top: [], middle: [], base: [] }) as unknown;

  const { data: inserted, error } = await supabase
    .from("perfumes")
    .insert({
      name: str(p.name, 120) || "Gift Set",
      name_ar: str(p.nameAr, 120) || "طقم هدية",
      description: str(p.description, 1000),
      description_ar: str(p.descriptionAr, 1000),
      fragrance_world: str(p.occasion, 60),
      fragrance_notes: notes,
      fragrance_notes_ar: notes,
      price: totalPrice,
      gender,
      image,
      // Fixed, not caller-supplied — see the note at the top of this file.
      size: "Gift Set",
      type: "gift",
      concentration: "Gift Set",
      rating: 5,
      reviews: 0,
      stock_quantity: 5,
      is_active: true,
      has_samples: false,
      has_bottle_sizes: false,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("publish-gift-set: insert failed", error?.message);
    return json({ error: "Could not publish the gift set" }, 500);
  }

  // Card image row. perfume_images requires image_name/file_path/mime_type.
  if (image) {
    const path = str(p.imagePath, 300) ||
      (image.includes("/perfume-images/")
        ? image.split("/perfume-images/")[1]
        : `gifts/${inserted.id}.png`);
    const { error: imgErr } = await supabase.from("perfume_images").insert({
      perfume_id: inserted.id,
      image_url: image,
      image_name: path.split("/").pop() || "gift.png",
      file_path: path,
      file_size: 0,
      mime_type: str(p.imageMime, 60) || "image/png",
      is_primary: true,
      display_order: 0,
    });
    // Non-fatal: the set is published either way, it just has no card image.
    if (imgErr) console.error("publish-gift-set: image row failed", imgErr.message);
  }

  return json({ id: inserted.id });
});
