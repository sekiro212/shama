import { config } from "../config";
import { withRetry, withTimeout } from "../utils/retry";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

/**
 * Generate a professional marketing image for a perfume product using Gemini.
 * Returns the raw image buffer and MIME type.
 */
export async function generateProductImage(
  productName: string,
  brand: string,
  description: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const prompt = `Create a professional, luxurious marketing photograph of a perfume bottle.
Product: "${productName}" by ${brand || "luxury brand"}.
${description ? `Description: ${description}` : ""}
Style: Studio photography, soft dramatic side lighting, elegant background, high-end perfume advertising.
The bottle should be the centerpiece — centered, sharp focus, photorealistic.
Do NOT include any text overlays, watermarks, or logos.`;

  return withRetry(() =>
    withTimeout(async () => {
      const res = await fetch(`${GEMINI_URL}?key=${config.geminiApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            imageMimeType: "image/png",
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts;
      const imagePart = parts?.find(
        (p: Record<string, unknown>) => p.inlineData
      );

      if (!imagePart?.inlineData) {
        throw new Error("Gemini did not return an image");
      }

      const buffer = Buffer.from(
        (imagePart.inlineData as { data: string }).data,
        "base64"
      );
      const mimeType =
        (imagePart.inlineData as { mimeType?: string }).mimeType || "image/png";

      return { buffer, mimeType };
    }, 45_000) // image gen takes 15-30s
  );
}
