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
          modalities: ["image", "text"],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const message = data.choices?.[0]?.message;
      if (!message) throw new Error("No response from image model");

      // OpenRouter returns images in message.images[] array
      // Each: { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
      let base64Data: string | undefined;
      let mimeType = "image/png";

      // Check message.images (OpenRouter format)
      const images = message.images as Array<{
        type: string;
        image_url?: { url?: string };
      }> | undefined;

      if (images && images.length > 0) {
        for (const img of images) {
          const dataUrl = img.image_url?.url;
          if (dataUrl) {
            const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              base64Data = match[2];
              break;
            }
          }
        }
      }

      // Fallback: check if content is array with image parts
      if (!base64Data && Array.isArray(message.content)) {
        for (const part of message.content) {
          const p = part as { type?: string; image_url?: { url?: string } };
          if (p.type === "image_url" && p.image_url?.url) {
            const match = p.image_url.url.match(/^data:(image\/\w+);base64,(.+)$/);
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
    }, 60_000)
  );
}
