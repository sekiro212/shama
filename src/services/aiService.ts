import { GoogleGenAI } from "@google/genai";
import { fetchProducts, Product } from "./productsService";

export interface SmartSearchResult {
  product: Product;
  reason: string;      // 1–2 sentence explanation of why this perfume matches
  matchScore: number;  // integer 60–99
}

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
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
      .map(
        (p: Product) =>
          `- ${p.name} | ${p.price} LYD | Gender: ${p.gender || "unisex"} | Size: ${p.size} | Type: ${p.type} | Rating: ${p.rating}/5 | ${
            p.stock_quantity === 0 ? "SOLD OUT" : `In Stock (${p.stock_quantity})`
          } | Top Notes: ${p.fragranceNotes?.top?.join(", ") || "N/A"} | Middle Notes: ${p.fragranceNotes?.middle?.join(", ") || "N/A"} | Base Notes: ${p.fragranceNotes?.base?.join(", ") || "N/A"} | Description: ${p.description?.slice(0, 120) || "N/A"}`
      )
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
  if (!ai) {
    return "I'm currently unavailable. Please make sure the AI service is configured with a valid API key.";
  }

  try {
    const productContext = await buildProductContext();
    const systemInstruction = SYSTEM_PROMPT + productContext;

    const contents = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "model",
        parts: [{ text: msg.text }],
      })),
      { role: "user" as const, parts: [{ text: userMessage }] },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    });

    return response.text || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("AI Chat Error:", error);
    return "I'm experiencing some difficulties right now. Please try again in a moment.";
  }
}

export async function* chatWithAIStream(
  userMessage: string,
  conversationHistory: { role: "user" | "model"; text: string }[]
): AsyncGenerator<string> {
  if (!ai) {
    yield "I'm currently unavailable. Please make sure the AI service is configured with a valid API key.";
    return;
  }

  try {
    const productContext = await buildProductContext();
    const systemInstruction = SYSTEM_PROMPT + productContext;

    const contents = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "model",
        parts: [{ text: msg.text }],
      })),
      { role: "user" as const, parts: [{ text: userMessage }] },
    ];

    const response = await ai.models.generateContentStream({
      model: "gemini-3.1-flash-lite-preview",
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    });

    for await (const chunk of response) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    console.error("AI Stream Error:", error);
    yield "I'm experiencing some difficulties right now. Please try again in a moment.";
  }
}

export async function aiSearch(query: string): Promise<Product[]> {
  if (!ai) return [];

  try {
    const productContext = await buildProductContext();
    const prompt = `Given this perfume catalog:\n${productContext}\n\nA customer searches for: "${query}"\n\nReturn ONLY a JSON array of product names that best match this query (max 6). Consider fragrance notes, gender, price, and description. Example: ["Product Name 1", "Product Name 2"]\n\nReturn ONLY the JSON array, nothing else.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 256, temperature: 0.3 },
    });

    const text = response.text?.trim() || "[]";
    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
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
  if (!ai) return [];

  // Issue 4: Guard against empty query
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

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 1024, temperature: 0.3 },
    });

    const text = response.text?.trim() || "[]";
    // Strip markdown code fences if present
    const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
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
        // Issue 1: Bidirectional substring fallback for name matching
        const product = products.find(
          (p) =>
            p.name.trim().toLowerCase() === item.name.trim().toLowerCase() ||
            p.name.toLowerCase().includes(item.name.toLowerCase()) ||
            item.name.toLowerCase().includes(p.name.toLowerCase())
        );
        if (!product) return null;

        // Issue 2: Validate matchScore and reason before using them
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
  if (!ai) {
    return "AI service is not configured. Please add your Gemini API key.";
  }

  try {
    const prompt = `Write a luxurious, evocative marketing description for a perfume with these details:
- Name: ${name}
- Gender: ${gender || "unisex"}
- Top Notes: ${notes.top?.join(", ") || "N/A"}
- Middle Notes: ${notes.middle?.join(", ") || "N/A"}
- Base Notes: ${notes.base?.join(", ") || "N/A"}

Write 2-3 sentences. Be poetic and sensory. Make it compelling for an online perfume store. Do not use hashtags or emojis.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 256, temperature: 0.8 },
    });

    return response.text?.trim() || "Could not generate description.";
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
  if (!ai) return "pending";

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

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 10, temperature: 0.1 },
    });

    const raw = response.text?.trim().toLowerCase() || "pending";
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
  if (!ai) return [];

  try {
    const productContext = await buildProductContext();
    const prompt = `Given this perfume catalog:\n${productContext}\n\nA customer took a fragrance quiz with these answers:
- Occasion: ${answers.occasion}
- Season: ${answers.season}
- Scent Family: ${answers.scentFamily}
- Intensity: ${answers.intensity}
- Gender Preference: ${answers.gender}
- Budget: ${answers.budget}

Return a JSON array of the top 3 best-matching products. For each product include:
- "name": exact product name from the catalog
- "matchScore": percentage match (60-98)
- "reason": 1-2 sentence explanation of why this perfume matches their preferences

Return ONLY valid JSON array, nothing else. Example:
[{"name":"Product Name","matchScore":92,"reason":"Perfect match because..."}]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 512, temperature: 0.5 },
    });

    const text = response.text?.trim() || "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    return JSON.parse(match[0]);
  } catch (error) {
    console.error("AI Quiz Error:", error);
    return [];
  }
}

export async function getGiftSuggestions(description: string): Promise<Product[]> {
  if (!ai) return [];
  try {
    // Single fetch — build context inline to avoid the double round-trip of
    // calling both buildProductContext() and fetchProducts() separately.
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

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 256, temperature: 0.4 },
    });

    const text = response.text?.trim() || "[]";
    const match = text.match(/\[[\s\S]*\]/);
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

export async function generateGiftImageBase64(prompt: string): Promise<string> {
  if (!ai) throw new Error("AI service not configured");
  // NOTE: Verify model ID at https://ai.google.dev/gemini-api/docs/image-generation
  // Fall back to "imagen-3.0-generate-001" if imagen-4.0 is unavailable on your API key
  const response = await (ai.models as any).generateImages({
    model: "imagen-4.0-generate-001",
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: "image/jpeg",
      aspectRatio: "1:1",
    },
  });
  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error("No image generated");
  return imageBytes as string;
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
  if (!ai) return fallback;

  try {
    const lang = language === "ar" ? "Arabic" : "English";
    const prompt = `You are a luxury perfume writer. For the fragrance "${productName}", write one short poetic sentence per phase (max 15 words each) describing what the wearer experiences. Respond in ${lang}.

Top notes (${notes.top?.join(", ") || "none"}):
Heart notes (${notes.middle?.join(", ") || "none"}):
Base notes (${notes.base?.join(", ") || "none"}):

Return ONLY valid JSON, nothing else:
{"top":"sentence here","middle":"sentence here","base":"sentence here"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 256, temperature: 0.75 },
    });

    const text = response.text?.trim() || "{}";
    const match = text.match(/\{[\s\S]*\}/);
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
  if (!ai) return null;

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
  "bestSeason": "${answers.season || "Autumn"}",
  "bestSeasonAr": "الخريف"
}
Rules: families must sum to 100, use 2-3 families, archetype must be evocative and poetic, signatureNotes should match the scent families chosen.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 400, temperature: 0.85 },
    });

    const text = response.text?.trim() || "{}";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as ScentDNACard;
  } catch {
    return null;
  }
}
