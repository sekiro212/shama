/** db-reset-giftsets.mts — remove the 4 previously-added gift sets, then add ONE fresh one. */
import { createClient } from "@supabase/supabase-js";
const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const OLD_IDS = [
  "559e6c97-6f97-483f-a5da-a6ac6843c279",
  "a5e42deb-fd59-4cc9-8e87-22cd17d85693",
  "6bf71bc2-4b3e-4101-8ba3-85f7471d3c98",
  "02495610-ae00-4b69-b39b-324447a7ae6b",
];

// 1) remove old gift sets (images first, then products)
const { error: delImgErr } = await sb.from("perfume_images").delete().in("perfume_id", OLD_IDS);
console.log("delete old images:", delImgErr ? `❌ ${delImgErr.message}` : "✅");
const { error: delErr } = await sb.from("perfumes").delete().in("id", OLD_IDS);
console.log("delete old gift sets:", delErr ? `❌ ${delErr.message}` : "✅ removed 4");

// 2) add ONE fresh gift set (Eid-themed, occasion-tagged so the Eid filter matches)
async function imageFor(name: string): Promise<string | null> {
  const { data: p } = await sb.from("perfumes").select("id,image").ilike("name", `%${name}%`).limit(1).maybeSingle();
  if (!p) return null;
  const { data: img } = await sb.from("perfume_images").select("image_url").eq("perfume_id", p.id).order("is_primary", { ascending: false }).limit(1).maybeSingle();
  return img?.image_url || (p as any).image || null;
}

const image = await imageFor("Baccarat Rouge 540");
const row = {
  name: "Eid Celebration Gift Set",
  name_ar: "طقم هدية احتفال العيد",
  price: 1450,
  gender: "unisex",
  description: "A radiant Eid gift — a luxurious amber-floral signature with saffron and cedar, beautifully boxed to celebrate the occasion in style.",
  description_ar: "هدية عيد مشرقة — توقيع عنبري زهري فاخر بالزعفران والأرز، معبّأ بأناقة للاحتفال بالمناسبة بأبهى صورة.",
  fragrance_notes: { top: ["Saffron", "Jasmine"], middle: ["Amberwood", "Ambergris"], base: ["Cedar", "Fir Resin"] },
  fragrance_notes_ar: { top: ["زعفران", "ياسمين"], middle: ["خشب العنبر", "العنبر"], base: ["أرز", "راتنج التنوب"] },
  image,
  size: "Gift Set",
  type: "gift",
  concentration: "Gift Set",
  fragrance_world: "Amber Floral",
  rating: 5,
  reviews: 0,
  stock_quantity: 8,
  is_active: true,
  has_samples: false,
  has_bottle_sizes: false,
};

const { data: inserted, error: insErr } = await sb.from("perfumes").insert(row).select("id,name").single();
if (insErr) { console.error("❌ insert failed:", insErr.message); process.exit(1); }
const id = (inserted as any).id;
console.log("✅ new gift set:", (inserted as any).name, "->", id);

if (image) {
  const filePath = image.includes("/perfume-images/") ? image.split("/perfume-images/")[1] : `${id}/cover.jpg`;
  const { error: imgErr } = await sb.from("perfume_images").insert({
    perfume_id: id, image_url: image, image_name: filePath.split("/").pop() || "cover.jpg",
    file_path: filePath, file_size: 0, mime_type: "image/jpeg", is_primary: true, display_order: 0,
  });
  console.log("image row:", imgErr ? `❌ ${imgErr.message}` : "✅");
}

console.log("\nNEW GIFT SET ID (rollback):", id);
console.log("Rollback: delete from perfume_images where perfume_id='" + id + "'; delete from perfumes where id='" + id + "';");
process.exit(0);
