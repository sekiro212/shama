import { config } from "../config";
import { withRetry, withTimeout } from "../utils/retry";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-2.5-flash-image";

/**
 * Generate a professional marketing image for a perfume product
 * using OpenRouter's image generation (Gemini image model).
 */
export async function generateProductImage(
  productName: string,
  brand: string,
  description: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const prompt = `Create a professional, luxurious marketing photograph of a perfume bottle.
Product: "${productName}" by ${brand || "luxury brand"}.
${description ? `Description: ${description}` : ""}
Style: Studio photography, soft dramatic side lighting, elegant background, high-end perfume advertising.
The bottle should be the centerpiece — centered, sharp focus, photorealistic.
Do NOT include any text overlays, watermarks, or logos.`;

  return withRetry(() =>
    withTimeout(async () => {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.openRouterApiKey}`,
          "HTTP-Referer": "https://shama.ly",
          "X-Title": "Shama Admin Bot",
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          messages: [{ role: "user", content: prompt }],
          modalities: ["text", "image"],
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;

      // Response content can be a string or array of parts
      // Image parts have: { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
      let base64Data: string | undefined;
      let mimeType = "image/png";

      if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === "image_url" && part.image_url?.url) {
            const dataUrl = part.image_url.url as string;
            const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              base64Data = match[2];
              break;
            }
          }
        }
      }

      if (!base64Data) {
        throw new Error("Model did not return an image");
      }

      return { buffer: Buffer.from(base64Data, "base64"), mimeType };
    }, 60_000) // image gen can take 30-45s
  );
}
