/** db-add-giftsets.mts — insert curated type="gift" products so /gift-sets is populated.
 * Reversible: prints inserted perfume IDs. Reuses existing product images so cards render.
 * Run once: npx -y vite-node scripts/db-add-giftsets.mts
 */
import { createClient } from "@supabase/supabase-js";
const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

// pull a real primary image URL from an existing product (by name) to reuse on the set card
async function imageFor(name: string): Promise<string | null> {
  const { data: p } = await sb.from("perfumes").select("id,image").ilike("name", `%${name}%`).limit(1).maybeSingle();
  if (!p) return null;
  const { data: img } = await sb.from("perfume_images").select("image_url").eq("perfume_id", p.id).order("is_primary", { ascending: false }).limit(1).maybeSingle();
  return img?.image_url || (p as any).image || null;
}

const SETS = [
  {
    name: "Date Night Duo Gift Set", name_ar: "طقم هدية ثنائي السهرة",
    gender: "unisex", price: 950, srcImage: "Dior Sauvage Elixir",
    description: "A curated pair built for unforgettable evenings — a bold woody-amber signature paired with a warm spiced companion, wrapped and ready to gift.",
    description_ar: "ثنائي مختار لأمسيات لا تُنسى — توقيع خشبي عنبري جريء مع رفيق دافئ بالتوابل، مغلّف وجاهز للإهداء.",
    notes: { top: ["Cardamom", "Bergamot"], middle: ["Lavender", "Spices"], base: ["Amberwood", "Patchouli"] },
    fragrance_world: "Woody Oriental",
  },
  {
    name: "Floral Treasures Gift Set", name_ar: "طقم هدية كنوز الزهور",
    gender: "women", price: 1150, srcImage: "Miss Dior Rose",
    description: "An elegant trio of feminine florals — rose, orange blossom and soft musk — a thoughtful gift for someone who loves to bloom.",
    description_ar: "ثلاثية أنيقة من الزهور الأنثوية — الورد وزهر البرتقال والمسك الناعم — هدية راقية لمن تحب التألّق.",
    notes: { top: ["Rose", "Pear"], middle: ["Orange Blossom", "Jasmine"], base: ["White Musk", "Vanilla"] },
    fragrance_world: "Floral",
  },
  {
    name: "Fresh Escape Gift Set", name_ar: "طقم هدية نسمة منعشة",
    gender: "men", price: 880, srcImage: "Light Blue Eau Intense",
    description: "Crisp, clean and effortless — a citrus-aquatic set for the man who loves a fresh, daily signature. Perfect for warm days.",
    description_ar: "منعش ونظيف وسهل — طقم حمضي بحري للرجل الذي يحب توقيعاً يومياً منعشاً. مثالي للأيام الدافئة.",
    notes: { top: ["Grapefruit", "Mandarin"], middle: ["Sea Notes", "Rosemary"], base: ["Cedar", "Musk"] },
    fragrance_world: "Fresh Aquatic",
  },
  {
    name: "Oud Royalty Gift Set", name_ar: "طقم هدية العود الملكي",
    gender: "unisex", price: 1750, srcImage: "Ombre Nomade",
    description: "The ultimate luxury gift — deep, smoky oud with incense and amber, presented for those who appreciate a regal, long-lasting trail.",
    description_ar: "هدية الفخامة القصوى — عود عميق مدخّن مع البخور والعنبر، مقدَّم لمن يقدّر أثراً ملكياً يدوم طويلاً.",
    notes: { top: ["Saffron", "Raspberry"], middle: ["Oud", "Rose"], base: ["Incense", "Amber"] },
    fragrance_world: "Oud",
  },
];

const inserted: { id: string; name: string }[] = [];
for (const s of SETS) {
  const image = await imageFor(s.srcImage);
  const row = {
    name: s.name, name_ar: s.name_ar, price: s.price, gender: s.gender,
    description: s.description, description_ar: s.description_ar,
    fragrance_notes: s.notes, fragrance_notes_ar: s.notes,
    image, size: "Gift Set", type: "gift", concentration: "Gift Set",
    fragrance_world: s.fragrance_world, rating: 5, reviews: 0,
    stock_quantity: 10, is_active: true, has_samples: false, has_bottle_sizes: false,
  };
  const { data, error } = await sb.from("perfumes").insert(row).select("id,name").single();
  if (error) { console.error("INSERT FAILED for", s.name, "->", error.message); continue; }
  inserted.push(data as any);
  // primary image row so ProductCard renders a picture
  if (image) {
    const { error: imgErr } = await sb.from("perfume_images").insert({ perfume_id: (data as any).id, image_url: image, is_primary: true, display_order: 0 });
    if (imgErr) console.warn("  image row failed:", imgErr.message);
  }
  console.log("✅ inserted:", (data as any).name, "->", (data as any).id, image ? "(image ok)" : "(NO image)");
}

console.log("\n=== INSERTED GIFT SET IDS (for rollback) ===");
console.log(inserted.map((r) => r.id).join("\n") || "(none)");
console.log("\nRollback SQL:\n  delete from perfume_images where perfume_id in ('" + inserted.map(r=>r.id).join("','") + "');\n  delete from perfumes where id in ('" + inserted.map(r=>r.id).join("','") + "');");
process.exit(0);
