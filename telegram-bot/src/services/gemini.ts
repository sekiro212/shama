import { GoogleGenAI } from "@google/genai";
import { config } from "../config";
import { withRetry, withTimeout } from "../utils/retry";
import type { ProductDraft, FragranceNotes } from "../types";

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

// ─── Bilingual JSON schema prompt ─────────────

const BILINGUAL_SCHEMA = `{
  "name": "Full perfume name in English",
  "brand": "Brand/house name",
  "description": "Luxurious 2-3 sentence marketing description in English",
  "fragrance_notes": {
    "top": ["note1", "note2"],
    "middle": ["note1", "note2"],
    "base": ["note1", "note2"]
  },
  "name_ar": "اسم العطر الكامل بالعربية",
  "description_ar": "وصف تسويقي فاخر من 2-3 جمل بالعربية",
  "fragrance_notes_ar": {
    "top": ["نوتة1", "نوتة2"],
    "middle": ["نوتة1", "نوتة2"],
    "base": ["نوتة1", "نوتة2"]
  }
}`;

// ─── Private JSON parser ──────────────────────

function parseGeminiJson(text: string): Partial<ProductDraft> {
  if (!text) throw new Error("Empty response from Gemini");
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in Gemini response: ${text.slice(0, 200)}`);
  return JSON.parse(match[0]);
}

// ─── Image analysis (accepts Buffer) ─────────

export async function analyzeImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<Partial<ProductDraft>> {
  const prompt = `You are a perfume expert. Carefully analyze this image of a perfume bottle.
Identify the perfume brand and name from the bottle label, cap, and packaging.

Return ONLY this JSON object with no extra text.
You MUST provide content in BOTH English AND Arabic:
${BILINGUAL_SCHEMA}

If you cannot clearly identify the perfume from the image, set name to "Unknown Perfume" and brand to "Unknown Brand".
The Arabic name should be a natural Arabic translation/transliteration of the perfume name.
The Arabic description should be a unique marketing description in Arabic, not a direct translation.
The Arabic fragrance notes should be proper Arabic names for each note.`;

  return withRetry(() =>
    withTimeout(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  data: imageBuffer.toString("base64"),
                  mimeType,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: { maxOutputTokens: 1200, temperature: 0.2 },
      });

      const text = response.text;
      if (!text) throw new Error("Gemini returned empty text response for image");
      return parseGeminiJson(text);
    }, 30_000)
  );
}

// ─── Text-based product enrichment ───────────

export async function enrichProductData(
  name: string,
  brand: string
): Promise<{
  description: string;
  description_ar: string;
  fragrance_notes: FragranceNotes;
  fragrance_notes_ar: FragranceNotes;
  name_ar: string;
}> {
  const SAFE_DEFAULT = {
    description: "",
    description_ar: "",
    fragrance_notes: { top: [], middle: [], base: [] },
    fragrance_notes_ar: { top: [], middle: [], base: [] },
    name_ar: name,
  };

  try {
    const prompt = `You are a perfume expert with encyclopedic knowledge of fragrances.
Look up this perfume: "${name}" by "${brand || "Unknown brand"}".

Return ONLY this JSON object with no extra text. You MUST provide content in BOTH English AND Arabic:
${BILINGUAL_SCHEMA}

The Arabic name should be a natural Arabic translation/transliteration.
The Arabic description should be a unique marketing description in Arabic, not a direct translation.
The Arabic fragrance notes should be proper Arabic names for each note.
If fragrance notes are unknown, make educated guesses based on the brand and style.`;

    return await withRetry(() =>
      withTimeout(async () => {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-preview",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { maxOutputTokens: 1200, temperature: 0.2 },
        });
        const text = response.text;
        if (!text) return SAFE_DEFAULT;
        const parsed = parseGeminiJson(text);
        return {
          description: (parsed.description as string) ?? "",
          description_ar: (parsed.description_ar as string) ?? "",
          fragrance_notes: (parsed.fragrance_notes as FragranceNotes) ?? SAFE_DEFAULT.fragrance_notes,
          fragrance_notes_ar: (parsed.fragrance_notes_ar as FragranceNotes) ?? SAFE_DEFAULT.fragrance_notes_ar,
          name_ar: (parsed.name_ar as string) ?? name,
        };
      }, 25_000)
    );
  } catch {
    return SAFE_DEFAULT;
  }
}
