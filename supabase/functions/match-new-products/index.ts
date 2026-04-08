import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";
import { generatePromoCode } from "../_shared/promo-generator.ts";
import { buildNewProductEmail } from "../_shared/email-templates.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const MATCH_THRESHOLD = 0.6;

interface Product {
  id: string;
  name: string;
  price: number;
  gender: string | null;
  fragrance_notes: { top?: string[]; middle?: string[]; base?: string[] };
  images: { image_url: string }[];
}

interface TasteProfile {
  user_id: string;
  scent_families: { name: string; score: number }[];
  preferred_notes: { note: string; score: number }[];
  price_range: { min: number; max: number; confidence: number };
  gender_pref: { value: string; confidence: number };
  intensity_pref: { value: string; confidence: number };
}

// Map fragrance notes to scent families
const NOTE_FAMILY_MAP: Record<string, string[]> = {
  fresh: ["citrus", "bergamot", "lemon", "lime", "grapefruit", "mint", "green tea", "cucumber", "aquatic", "marine", "ozonic"],
  floral: ["rose", "jasmine", "lily", "iris", "violet", "peony", "tuberose", "magnolia", "gardenia", "lavender", "geranium"],
  woody: ["cedar", "sandalwood", "vetiver", "patchouli", "oakmoss", "birch", "pine", "teak", "mahogany"],
  oriental: ["oud", "amber", "musk", "incense", "myrrh", "benzoin", "vanilla", "tonka", "balsam", "frankincense"],
  citrus: ["bergamot", "lemon", "lime", "orange", "mandarin", "grapefruit", "yuzu"],
  spicy: ["pepper", "cardamom", "cinnamon", "clove", "saffron", "ginger", "nutmeg", "cumin"],
  gourmand: ["vanilla", "chocolate", "coffee", "caramel", "honey", "praline", "almond"],
};

function getProductFamilies(notes: Product["fragrance_notes"]): string[] {
  const allNotes = [
    ...(notes.top || []),
    ...(notes.middle || []),
    ...(notes.base || []),
  ].map((n) => n.toLowerCase());

  const families = new Set<string>();
  for (const [family, keywords] of Object.entries(NOTE_FAMILY_MAP)) {
    for (const note of allNotes) {
      if (keywords.some((k) => note.includes(k))) {
        families.add(family);
      }
    }
  }
  return [...families];
}

function scoreMatch(product: Product, profile: TasteProfile): number {
  let score = 0;
  let weights = 0;

  // 1. Scent family overlap (weight: 0.35)
  const productFamilies = getProductFamilies(product.fragrance_notes);
  if (productFamilies.length > 0 && profile.scent_families.length > 0) {
    const familyScores = profile.scent_families
      .filter((f) => productFamilies.includes(f.name))
      .map((f) => f.score);
    if (familyScores.length > 0) {
      score += 0.35 * (familyScores.reduce((a, b) => a + b, 0) / familyScores.length);
    }
    weights += 0.35;
  }

  // 2. Note overlap (weight: 0.25)
  const allProductNotes = [
    ...(product.fragrance_notes.top || []),
    ...(product.fragrance_notes.middle || []),
    ...(product.fragrance_notes.base || []),
  ].map((n) => n.toLowerCase());

  if (allProductNotes.length > 0 && profile.preferred_notes.length > 0) {
    const noteScores = profile.preferred_notes
      .filter((n) => allProductNotes.some((pn) => pn.includes(n.note.toLowerCase())))
      .map((n) => n.score);
    if (noteScores.length > 0) {
      score += 0.25 * (noteScores.reduce((a, b) => a + b, 0) / noteScores.length);
    }
    weights += 0.25;
  }

  // 3. Gender match (weight: 0.2)
  if (product.gender && profile.gender_pref.confidence > 0) {
    const genderMatch =
      product.gender === profile.gender_pref.value ||
      product.gender === "unisex" ||
      profile.gender_pref.value === "unisex";
    score += 0.2 * (genderMatch ? profile.gender_pref.confidence : 0);
    weights += 0.2;
  }

  // 4. Price in range (weight: 0.2)
  if (profile.price_range.confidence > 0) {
    const inRange =
      product.price >= profile.price_range.min &&
      product.price <= profile.price_range.max;
    score += 0.2 * (inRange ? profile.price_range.confidence : 0.2);
    weights += 0.2;
  }

  return weights > 0 ? score / weights : 0;
}

async function generateMatchReason(
  productName: string,
  userTopFamily: string,
  userTopNotes: string[],
  lang: "en" | "ar"
): Promise<string> {
  try {
    const prompt =
      lang === "ar"
        ? `اكتب جملة واحدة قصيرة (أقل من 25 كلمة) توضح لماذا عطر "${productName}" يناسب شخص يحب عطور ${userTopFamily} ونوتات مثل ${userTopNotes.join("، ")}. اجعلها دافئة وشخصية.`
        : `Write 1 short sentence (under 25 words) explaining why "${productName}" suits someone who loves ${userTopFamily} scents with notes like ${userTopNotes.join(", ")}. Warm, personal tone.`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://shama.ly",
        "X-Title": "Shama Perfumes",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 60,
      }),
    });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";
    // Strip Qwen3 thinking blocks
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    return cleaned || (lang === "ar" ? "يتوافق مع ذوقك العطري" : "Matches your taste profile");
  } catch {
    return lang === "ar" ? "يتوافق مع ذوقك العطري" : "Matches your taste profile";
  }
}

serve(async (req) => {
  try {
    const { product_ids } = await req.json();
    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return new Response(JSON.stringify({ error: "product_ids required" }), { status: 400 });
    }

    const supabase = getServiceClient();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const siteUrl = "https://shama.ly";
    let matched = 0;

    // Fetch products
    const { data: products } = await supabase
      .from("perfumes")
      .select("id, name, price, gender, fragrance_notes, images:perfume_images(image_url)")
      .in("id", product_ids)
      .eq("is_active", true);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ matched: 0, message: "No active products found" }));
    }

    // Fetch all active taste profiles
    const { data: profiles } = await supabase
      .from("user_taste_profiles")
      .select("user_id, scent_families, preferred_notes, price_range, gender_pref, intensity_pref")
      .gt("total_events_analyzed", 0);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ matched: 0, message: "No user profiles" }));
    }

    // Fetch email preferences for all profile users
    const profileUserIds = profiles.map((p) => p.user_id);
    const { data: emailPrefs } = await supabase
      .from("email_preferences")
      .select("user_id, language_pref, email_enabled, new_product_alerts")
      .in("user_id", profileUserIds)
      .eq("email_enabled", true)
      .eq("new_product_alerts", true);

    const prefsMap = new Map((emailPrefs || []).map((p) => [p.user_id, p]));

    for (const product of products as Product[]) {
      // Check which users already got this announcement
      const { data: announced } = await supabase
        .from("product_announcements")
        .select("user_id")
        .eq("product_id", product.id);
      const announcedSet = new Set((announced || []).map((a) => a.user_id));

      for (const profile of profiles as TasteProfile[]) {
        if (announcedSet.has(profile.user_id)) continue;
        if (!prefsMap.has(profile.user_id)) continue;

        const score = scoreMatch(product, profile);
        if (score < MATCH_THRESHOLD) continue;

        // Get user email
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
        if (!authUser?.user?.email) continue;

        const userPref = prefsMap.get(profile.user_id)!;
        const topFamily = profile.scent_families[0]?.name || "luxury";
        const topNotes = profile.preferred_notes.slice(0, 3).map((n) => n.note);

        // Generate personalized reasons
        const reasonEn = await generateMatchReason(product.name, topFamily, topNotes, "en");
        const reasonAr = await generateMatchReason(product.name, topFamily, topNotes, "ar");

        // Generate promo code
        const promo = await generatePromoCode(supabase, 10, 7);
        const unsubUrl = `${supabaseUrl}/functions/v1/unsubscribe?token=placeholder`;

        const productData = {
          name: product.name,
          price: product.price,
          imageUrl: product.images?.[0]?.image_url || "",
          id: product.id,
        };

        const bodyEn = buildNewProductEmail(productData, reasonEn, promo?.code || "SHAMA10", 10, siteUrl, "en", unsubUrl);
        const bodyAr = buildNewProductEmail(productData, reasonAr, promo?.code || "SHAMA10", 10, siteUrl, "ar", unsubUrl);

        await supabase.from("email_queue").insert({
          user_id: profile.user_id,
          email_type: "new_product_match",
          to_email: authUser.user.email,
          subject_en: `A new fragrance just for you`,
          subject_ar: `عطر جديد مختار لك`,
          body_html_en: bodyEn,
          body_html_ar: bodyAr,
          product_ids: [product.id],
          promo_code_id: promo?.id || null,
        });

        // Record announcement
        await supabase.from("product_announcements").insert({
          product_id: product.id,
          user_id: profile.user_id,
        });

        matched++;

        // Rate limit
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    return new Response(JSON.stringify({ matched }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
