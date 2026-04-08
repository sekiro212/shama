import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MODEL = "gpt-5.4-mini";

const SYSTEM_PROMPT = `You are a fragrance preference analyst for Shama, a Libyan luxury perfume store.
Analyze a customer's behavioral data and produce a structured taste profile.

INPUT: JSON with the customer's event history:
- quiz_completions: Quiz answer sets (occasion, scent_family, intensity, gender, budget)
- search_queries: Search terms used
- product_views: Products viewed (names, notes, gender, price)
- wishlist: Products in wishlist
- cart_history: Products added to cart
- purchases: Completed orders
- chatbot_queries: Questions asked to chatbot
- scent_dna: Most recent Scent DNA card (if any)
- existing_profile: Current taste profile (null for new users)

RULES:
1. Weight by reliability: purchases > wishlist > cart > quiz > views > searches > chatbot
2. Recent events carry more weight than older ones
3. Few events (< 5): assign low confidence (< 0.5), rely on quiz data
4. Conflicting signals: trust behavior (purchases, wishlist) over stated preferences (quiz)
5. If existing_profile provided: evolve incrementally, don't replace. Preserve high-confidence scores unless strong contradictory evidence
6. Notes: extract from product fragrance data, rank by frequency

OUTPUT: Valid JSON only, no markdown fences:
{
  "scent_families": [{"name": "oriental", "score": 0.85}],
  "preferred_notes": [{"note": "oud", "score": 0.9}],
  "price_range": {"min": 150, "max": 500, "confidence": 0.7},
  "gender_pref": {"value": "men", "confidence": 0.8},
  "occasion_pref": [{"occasion": "date_night", "score": 0.7}],
  "intensity_pref": {"value": "bold", "confidence": 0.75},
  "summary": "Brief 1-sentence profile summary"
}

CONSTRAINTS:
- Scores: 0.0-1.0
- scent_families: 2-5 from: fresh, floral, woody, oriental, citrus, aquatic, musk, spicy, gourmand
- preferred_notes: 3-10 notes
- gender_pref: men | women | unisex
- intensity_pref: light | moderate | bold
- occasion_pref: daily | date_night | office | special_event | casual | formal
- price_range: in LYD (Libyan Dinar)`;

interface EventSummary {
  quiz_completions: Record<string, string>[];
  search_queries: string[];
  product_views: { name: string; gender?: string; price: number }[];
  wishlist: { name: string; price: number }[];
  cart_history: { name: string; price: number; size: string }[];
  chatbot_queries: string[];
  scent_dna: Record<string, unknown> | null;
  existing_profile: Record<string, unknown> | null;
}

function summarizeEvents(events: { event_type: string; event_data: Record<string, unknown>; created_at: string }[]): EventSummary {
  const summary: EventSummary = {
    quiz_completions: [],
    search_queries: [],
    product_views: [],
    wishlist: [],
    cart_history: [],
    chatbot_queries: [],
    scent_dna: null,
    existing_profile: null,
  };

  for (const e of events) {
    const d = e.event_data;
    switch (e.event_type) {
      case "quiz_completion":
        if (d.answers) summary.quiz_completions.push(d.answers as Record<string, string>);
        break;
      case "search_query":
      case "ai_search_query":
        if (d.query) summary.search_queries.push(d.query as string);
        break;
      case "product_view":
        summary.product_views.push({
          name: (d.product_name as string) || "",
          gender: d.gender as string,
          price: (d.price as number) || 0,
        });
        break;
      case "wishlist_add":
        summary.wishlist.push({
          name: (d.product_name as string) || "",
          price: (d.price as number) || 0,
        });
        break;
      case "cart_add":
        summary.cart_history.push({
          name: (d.product_name as string) || "",
          price: (d.price as number) || 0,
          size: (d.size as string) || "",
        });
        break;
      case "chatbot_query":
        if (d.query) summary.chatbot_queries.push(d.query as string);
        break;
      case "scent_dna_generated":
        summary.scent_dna = d;
        break;
    }
  }

  // Deduplicate search queries
  summary.search_queries = [...new Set(summary.search_queries)];

  return summary;
}

async function analyzeWithGPT(eventSummary: EventSummary): Promise<Record<string, unknown> | null> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(eventSummary) },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    console.error("OpenAI error:", response.status, await response.text());
    return null;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // Try extracting JSON from markdown fences
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1].trim());
    return null;
  }
}

serve(async (req) => {
  try {
    const { user_ids } = await req.json();
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(JSON.stringify({ error: "user_ids required" }), { status: 400 });
    }

    const supabase = getServiceClient();
    const results: { user_id: string; success: boolean; error?: string }[] = [];

    for (const userId of user_ids.slice(0, 10)) {
      try {
        // Fetch all events for this user
        const { data: events, error: eventsError } = await supabase
          .from("user_events")
          .select("event_type, event_data, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        if (eventsError || !events || events.length === 0) {
          results.push({ user_id: userId, success: false, error: "No events found" });
          continue;
        }

        // Fetch existing profile
        const { data: existingProfile } = await supabase
          .from("user_taste_profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        // Summarize events
        const summary = summarizeEvents(events);
        if (existingProfile) {
          summary.existing_profile = {
            scent_families: existingProfile.scent_families,
            preferred_notes: existingProfile.preferred_notes,
            price_range: existingProfile.price_range,
            gender_pref: existingProfile.gender_pref,
            occasion_pref: existingProfile.occasion_pref,
            intensity_pref: existingProfile.intensity_pref,
          };
        }

        // Analyze with GPT
        const profile = await analyzeWithGPT(summary);
        if (!profile) {
          results.push({ user_id: userId, success: false, error: "GPT analysis failed" });
          continue;
        }

        // Upsert taste profile
        const lastEvent = events[events.length - 1];
        const { error: upsertError } = await supabase
          .from("user_taste_profiles")
          .upsert({
            user_id: userId,
            scent_families: profile.scent_families || [],
            preferred_notes: profile.preferred_notes || [],
            price_range: profile.price_range || { min: 0, max: 9999, confidence: 0 },
            gender_pref: profile.gender_pref || { value: "unisex", confidence: 0 },
            occasion_pref: profile.occasion_pref || [],
            intensity_pref: profile.intensity_pref || { value: "moderate", confidence: 0 },
            total_events_analyzed: events.length,
            last_event_at: lastEvent.created_at,
            profile_version: (existingProfile?.profile_version || 0) + 1,
          }, { onConflict: "user_id" });

        if (upsertError) {
          results.push({ user_id: userId, success: false, error: upsertError.message });
        } else {
          results.push({ user_id: userId, success: true });
        }

        // Rate limit: 200ms delay between users
        if (user_ids.indexOf(userId) < user_ids.length - 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch (err) {
        results.push({ user_id: userId, success: false, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
