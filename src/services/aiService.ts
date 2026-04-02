import { GoogleGenAI } from "@google/genai";
import { fetchProducts, Product } from "./productsService";

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
      model: "gemini-2.0-flash",
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
      model: "gemini-2.0-flash",
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
      model: "gemini-2.0-flash",
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
      model: "gemini-2.0-flash",
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
      model: "gemini-2.0-flash",
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
      model: "gemini-2.0-flash",
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
