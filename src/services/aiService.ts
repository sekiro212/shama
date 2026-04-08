import { fetchProducts, Product } from "./productsService";

export interface SmartSearchResult {
  product: Product;
  reason: string;      // 1-2 sentence explanation of why this perfume matches
  matchScore: number;  // integer 60-99
}

// --- OpenRouter configuration ---
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openai/gpt-5.2";
const OPENROUTER_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
  "HTTP-Referer": "https://shama.ly",
  "X-Title": "Shama Perfumes",
};

/** Strip Qwen3 thinking blocks from output */
function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/** Non-streaming OpenRouter call */
async function callOpenRouter(
  messages: { role: string; content: string }[],
  config: { temperature: number; maxTokens: number }
): Promise<string | null> {
  if (!OPENROUTER_API_KEY) return null;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: OPENROUTER_HEADERS,
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    console.error("OpenRouter error:", response.status, await response.text());
    return null;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  return text ? stripThinkTags(text) : null;
}

/** Streaming OpenRouter call — yields content chunks */
async function* callOpenRouterStream(
  messages: { role: string; content: string }[],
  config: { temperature: number; maxTokens: number }
): AsyncGenerator<string> {
  if (!OPENROUTER_API_KEY) return;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: OPENROUTER_HEADERS,
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    console.error("OpenRouter stream error:", response.status);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let inThinkBlock = false;
  let thinkAccum = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop() || ""; // keep incomplete last line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const payload = trimmed.slice(6).trim();
        if (payload === "[DONE]") return;

        try {
          const parsed = JSON.parse(payload);
          const content = parsed.choices?.[0]?.delta?.content;
          if (!content) continue;

          if (inThinkBlock) {
            // Accumulate until we find </think>
            thinkAccum += content;
            const endIdx = thinkAccum.indexOf("</think>");
            if (endIdx !== -1) {
              inThinkBlock = false;
              // Yield any text after the closing tag
              const after = thinkAccum.slice(endIdx + 8);
              thinkAccum = "";
              if (after) yield after;
            }
          } else if (content.includes("<think>")) {
            inThinkBlock = true;
            // Yield text before the tag, buffer the rest
            const before = content.split("<think>")[0];
            if (before) yield before;
            thinkAccum = content.slice(content.indexOf("<think>") + 7);
            // Check if the closing tag is in this same chunk
            const endIdx = thinkAccum.indexOf("</think>");
            if (endIdx !== -1) {
              inThinkBlock = false;
              const after = thinkAccum.slice(endIdx + 8);
              thinkAccum = "";
              if (after) yield after;
            }
          } else {
            yield content;
          }
        } catch {
          // skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Cache for product context
let cachedProductContext: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function buildProductContext(): Promise<string> {
  const now = Date.now();
  if (cachedProductContext && now - cacheTimestamp < CACHE_TTL) {
    return cachedProductContext;
  }

  try {
    const { products } = await fetchProducts(1, 100);
    const context = products
      .map((p: Product) => {
        const sampleLine =
          p.samples && p.samples.length > 0
            ? ` | Samples: ${p.samples
                .filter((s) => s.is_active)
                .map((s) => `${s.size}=${s.price}LYD`)
                .join(", ")}`
            : " | Samples: none";
        return `- ${p.name} | Full Bottle: ${p.price} LYD | Gender: ${p.gender || "unisex"} | Size: ${p.size} | Type: ${p.type} | Rating: ${p.rating}/5 | ${
          p.stock_quantity === 0 ? "SOLD OUT" : `In Stock (${p.stock_quantity})`
        }${sampleLine} | Top Notes: ${p.fragranceNotes?.top?.join(", ") || "N/A"} | Middle Notes: ${p.fragranceNotes?.middle?.join(", ") || "N/A"} | Base Notes: ${p.fragranceNotes?.base?.join(", ") || "N/A"} | Description: ${p.description?.slice(0, 120) || "N/A"}`;
      })
      .join("\n");

    cachedProductContext = context;
    cacheTimestamp = now;
    return context;
  } catch {
    return cachedProductContext || "Product catalog is temporarily unavailable.";
  }
}

const SYSTEM_PROMPT = `You are Shama's AI Perfume Consultant — a knowledgeable, friendly, and elegant fragrance expert for Shama Luxury Perfume Store (a Libyan perfume brand).

Your role:
- Help customers find the perfect fragrance based on their preferences, occasions, budget, and mood.
- Recommend specific products from the catalog provided below.
- Answer questions about fragrance notes, longevity, sillage, and scent families.
- Be warm, conversational, and use sensory language to describe scents.
- Always reference real products from the catalog. Never invent products.
- Prices are in Libyan Dinar (LYD).
- If a product is sold out, mention it and suggest alternatives.
- Keep responses concise but helpful (2-4 paragraphs max).
- When recommending products, always include the name and price.
- You can respond in Arabic if the customer writes in Arabic.

PRODUCT CATALOG:
`;

export async function chatWithAI(
  userMessage: string,
  conversationHistory: { role: "user" | "model"; text: string }[]
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    return "I'm currently unavailable. Please make sure the AI service is configured with a valid API key.";
  }

  try {
    const productContext = await buildProductContext();
    const systemInstruction = SYSTEM_PROMPT + productContext;

    const messages = [
      { role: "system", content: systemInstruction },
      ...conversationHistory.map((msg) => ({
        role: msg.role === "model" ? "assistant" : "user",
        content: msg.text,
      })),
      { role: "user", content: userMessage },
    ];

    const text = await callOpenRouter(messages, { temperature: 0.7, maxTokens: 1024 });
    return text || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("AI Chat Error:", error);
    return "I'm experiencing some difficulties right now. Please try again in a moment.";
  }
}

export async function* chatWithAIStream(
  userMessage: string,
  conversationHistory: { role: "user" | "model"; text: string }[]
): AsyncGenerator<string> {
  if (!OPENROUTER_API_KEY) {
    yield "I'm currently unavailable. Please make sure the AI service is configured with a valid API key.";
    return;
  }

  try {
    const productContext = await buildProductContext();
    const systemInstruction = SYSTEM_PROMPT + productContext;

    const messages = [
      { role: "system", content: systemInstruction },
      ...conversationHistory.map((msg) => ({
        role: msg.role === "model" ? "assistant" : "user",
        content: msg.text,
      })),
      { role: "user", content: userMessage },
    ];

    const stream = callOpenRouterStream(messages, { temperature: 0.7, maxTokens: 1024 });

    for await (const chunk of stream) {
      yield chunk;
    }
  } catch (error) {
    console.error("AI Stream Error:", error);
    yield "I'm experiencing some difficulties right now. Please try again in a moment.";
  }
}

export async function aiSearch(query: string): Promise<Product[]> {
  if (!OPENROUTER_API_KEY) return [];

  try {
    const productContext = await buildProductContext();
    const prompt = `Given this perfume catalog:\n${productContext}\n\nA customer searches for: "${query}"\n\nReturn ONLY a JSON array of product names that best match this query (max 6). Consider fragrance notes, gender, price, and description. Example: ["Product Name 1", "Product Name 2"]\n\nReturn ONLY the JSON array, nothing else.`;

    const text = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { temperature: 0.3, maxTokens: 256 }
    );

    const raw = text?.trim() || "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const names: string[] = JSON.parse(match[0]);
    const { products } = await fetchProducts(1, 100);
    return products.filter((p) =>
      names.some(
        (name) => p.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.name.toLowerCase())
      )
    );
  } catch (error) {
    console.error("AI Search Error:", error);
    return [];
  }
}

export async function smartSearch(query: string): Promise<SmartSearchResult[]> {
  if (!OPENROUTER_API_KEY) return [];

  if (!query.trim()) return [];

  try {
    const [productContext, { products }] = await Promise.all([
      buildProductContext(),
      fetchProducts(1, 100),
    ]);

    const prompt = `You are a professional perfume consultant for Shama, a Libyan perfume store.

Given this perfume catalog:
${productContext}

The customer is looking for: "${query}"

Return ONLY a valid JSON array (no markdown, no explanation) of up to 6 best-matching perfumes.
Each object must have:
- "name": exact product name from the catalog (string)
- "reason": 1-2 sentences (max 20 words) explaining why this perfume matches the customer's request (string)
- "matchScore": integer between 60 and 99 representing how well it matches (number)

Consider: scent family (woody, floral, fresh, oriental, citrus, musk), occasion (night out, daily, office, date, special event), season (summer, winter, spring, autumn), mood, gender, price range, fragrance notes, and intensity.

Support both English and Arabic queries.

If no perfumes match well, return an empty array [].

Example format:
[{"name":"Oud Noir","reason":"Rich oud base perfect for evening occasions.","matchScore":95}]`;

    const text = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { temperature: 0.3, maxTokens: 1024 }
    );

    const raw = text?.trim() || "[]";
    // Strip markdown code fences if present
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const match = stripped.match(/\[[\s\S]*\]/);
    if (!match) return [];

    let parsed: { name: string; reason: string; matchScore: number }[];
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }

    const results: SmartSearchResult[] = parsed
      .map((item) => {
        const product = products.find(
          (p) =>
            p.name.trim().toLowerCase() === item.name.trim().toLowerCase() ||
            p.name.toLowerCase().includes(item.name.toLowerCase()) ||
            item.name.toLowerCase().includes(p.name.toLowerCase())
        );
        if (!product) return null;

        const matchScore =
          typeof item.matchScore === "number" && isFinite(item.matchScore)
            ? Math.min(99, Math.max(0, item.matchScore))
            : 60;
        const reason =
          typeof item.reason === "string" && item.reason.trim()
            ? item.reason.trim()
            : "";

        return { product, reason, matchScore };
      })
      .filter((r): r is SmartSearchResult => r !== null)
      .sort((a, b) => b.matchScore - a.matchScore);

    return results;
  } catch (error) {
    console.error("Smart Search Error:", error);
    return [];
  }
}

export async function generateProductDescription(
  name: string,
  notes: { top: string[]; middle: string[]; base: string[] },
  gender?: string
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    return "AI service is not configured. Please add your OpenRouter API key.";
  }

  try {
    const prompt = `Write a luxurious, evocative marketing description for a perfume with these details:
- Name: ${name}
- Gender: ${gender || "unisex"}
- Top Notes: ${notes.top?.join(", ") || "N/A"}
- Middle Notes: ${notes.middle?.join(", ") || "N/A"}
- Base Notes: ${notes.base?.join(", ") || "N/A"}

Write 2-3 sentences. Be poetic and sensory. Make it compelling for an online perfume store. Do not use hashtags or emojis.`;

    const text = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { temperature: 0.8, maxTokens: 256 }
    );

    return text || "Could not generate description.";
  } catch (error) {
    console.error("AI Description Error:", error);
    return "Failed to generate description. Please try again.";
  }
}

export async function evaluateReview(
  rating: number,
  comment: string,
  productName: string
): Promise<"approved" | "pending"> {
  if (!OPENROUTER_API_KEY) return "pending";

  try {
    const prompt = `You are a content moderator for Shama, a luxury perfume store.

Evaluate this customer review and respond with ONLY the word "approved" or "pending".

Product: ${productName}
Star Rating: ${rating}/5
Review Text: "${comment}"

Mark as "pending" if ANY of these are true:
- Fewer than 15 characters
- Gibberish, random characters, or meaningless text
- Offensive, hateful, or inappropriate language
- Spam or promotional content
- Rating severely contradicts the text sentiment (e.g., 1-star but text is very positive, or 5-star but text is very negative)
- Completely unrelated to fragrances or the shopping experience

Otherwise mark as "approved".

Respond with ONLY one word: approved or pending`;

    const text = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { temperature: 0.1, maxTokens: 10 }
    );

    const raw = text?.trim().toLowerCase() || "pending";
    return raw === "approved" ? "approved" : "pending";
  } catch (error) {
    console.error("AI Review Evaluation Error:", error);
    return "pending";
  }
}

export async function getQuizRecommendations(
  answers: Record<string, string>
): Promise<
  { name: string; matchScore: number; reason: string }[]
> {
  if (!OPENROUTER_API_KEY) return [];

  try {
    const productContext = await buildProductContext();
    const formatLabel =
      answers.format === "sample"
        ? "samples only"
        : answers.format === "full_bottle"
        ? "full bottle only"
        : "open to both samples and full bottles";

    const budgetContext =
      answers.format === "sample"
        ? `Budget for samples: ${answers.budget.replace(/_/g, " ")} LYD`
        : answers.format === "full_bottle"
        ? `Budget for full bottle: ${answers.budget.replace(/_/g, " ")} LYD`
        : `Flexible budget: ${answers.budget.replace(/_/g, " ")} LYD`;

    const prompt = `Given this perfume catalog:\n${productContext}\n\nA customer took a fragrance quiz with these answers:
- Occasion: ${answers.occasion}
- Scent Family: ${answers.scentFamily}
- Intensity: ${answers.intensity}
- Gender Preference: ${answers.gender}
- Purchase Format: ${formatLabel}
- ${budgetContext}

The catalog shows Full Bottle prices AND sample prices for each product. Use sample prices when evaluating budget fit for customers who want samples.
In the "reason" field, mention whether the price fits their budget (reference sample or full bottle price as appropriate).

Return a JSON array of the top 3 best-matching products. For each product include:
- "name": exact product name from the catalog
- "matchScore": percentage match (60-98)
- "reason": 1-2 sentence explanation of why this perfume matches their preferences, mentioning price fit

Return ONLY valid JSON array, nothing else. Example:
[{"name":"Product Name","matchScore":92,"reason":"Perfect match because..."}]`;

    const text = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { temperature: 0.5, maxTokens: 512 }
    );

    const raw = text?.trim() || "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];

    return JSON.parse(match[0]);
  } catch (error) {
    console.error("AI Quiz Error:", error);
    return [];
  }
}

export async function getGiftSuggestions(description: string): Promise<Product[]> {
  if (!OPENROUTER_API_KEY) return [];
  try {
    const { products } = await fetchProducts(1, 100);
    const productContext = products
      .map(
        (p: Product) =>
          `- ${p.name} | ${p.price} LYD | Gender: ${p.gender || "unisex"} | Type: ${p.type} | Rating: ${p.rating}/5 | ${
            p.stock_quantity === 0 ? "SOLD OUT" : "In Stock"
          } | Top Notes: ${p.fragranceNotes?.top?.join(", ") || "N/A"} | Middle Notes: ${p.fragranceNotes?.middle?.join(", ") || "N/A"} | Base Notes: ${p.fragranceNotes?.base?.join(", ") || "N/A"}`
      )
      .join("\n");

    const prompt = `You are a gift curator for Shama, a luxury Libyan perfume store.

Given this perfume catalog:
${productContext}

A customer wants to build a gift with this description: "${description}"

Return ONLY a valid JSON array of 4-6 product names that would make the best gift combination.
Consider gender, occasion, scent compatibility, and price range.
Return ONLY product names that exist exactly in the catalog.
Example: ["Product Name 1", "Product Name 2"]

Return ONLY the JSON array, nothing else.`;

    const text = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { temperature: 0.4, maxTokens: 256 }
    );

    const raw = text?.trim() || "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const names: string[] = JSON.parse(match[0]);
    return products.filter((p) =>
      names.some(
        (name) =>
          p.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(p.name.toLowerCase())
      )
    );
  } catch (error) {
    console.error("Gift Suggestions Error:", error);
    return [];
  }
}

export async function generateTimelineDescriptions(
  productName: string,
  notes: { top: string[]; middle: string[]; base: string[] },
  language: string
): Promise<{ top: string; middle: string; base: string }> {
  const fallback = {
    top: notes.top?.join(", ") || "—",
    middle: notes.middle?.join(", ") || "—",
    base: notes.base?.join(", ") || "—",
  };
  if (!OPENROUTER_API_KEY) return fallback;

  try {
    const lang = language === "ar" ? "Arabic" : "English";
    const prompt = `You are a luxury perfume writer. For the fragrance "${productName}", write one short poetic sentence per phase (max 15 words each) describing what the wearer experiences. Respond in ${lang}.

Top notes (${notes.top?.join(", ") || "none"}):
Heart notes (${notes.middle?.join(", ") || "none"}):
Base notes (${notes.base?.join(", ") || "none"}):

Return ONLY valid JSON, nothing else:
{"top":"sentence here","middle":"sentence here","base":"sentence here"}`;

    const text = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { temperature: 0.75, maxTokens: 256 }
    );

    const raw = text?.trim() || "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]);
    return {
      top: parsed.top || fallback.top,
      middle: parsed.middle || fallback.middle,
      base: parsed.base || fallback.base,
    };
  } catch {
    return fallback;
  }
}

export interface ScentDNACard {
  archetype: string;
  archetypeAr: string;
  families: { name: string; nameAr: string; percent: number }[];
  signatureNotes: string[];
  bestTime: string;
  bestTimeAr: string;
  bestSeason: string;
  bestSeasonAr: string;
}

export async function getScentDNACard(
  answers: Record<string, string>
): Promise<ScentDNACard | null> {
  if (!OPENROUTER_API_KEY) return null;

  try {
    const prompt = `A person answered a fragrance quiz:
- Occasion: ${answers.occasion || "daily"}
- Season: ${answers.season || "spring"}
- Scent Family: ${answers.scentFamily || "floral"}
- Intensity: ${answers.intensity || "moderate"}
- Gender Preference: ${answers.gender || "unisex"}

Create a unique fragrance identity card for this person. Return ONLY valid JSON:
{
  "archetype": "English poetic archetype name (e.g. 'The Desert Wanderer', 'The Midnight Bloom', 'The Silk Road Dreamer')",
  "archetypeAr": "Same name translated poetically to Arabic",
  "families": [
    {"name":"Oriental","nameAr":"شرقي","percent":60},
    {"name":"Woody","nameAr":"خشبي","percent":40}
  ],
  "signatureNotes": ["Note1","Note2","Note3"],
  "bestTime": "Evening",
  "bestTimeAr": "المساء",
  "bestSeason": "based on the season preference above",
  "bestSeasonAr": "Arabic translation of the season above"
}
Rules: families must sum to 100, use 2-3 families, archetype must be evocative and poetic, signatureNotes should match the scent families chosen.`;

    const text = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { temperature: 0.85, maxTokens: 400 }
    );

    const raw = text?.trim() || "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as ScentDNACard;
  } catch {
    return null;
  }
}
