import { GoogleGenAI } from "@google/genai";
import { config } from "../config";

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function generateMarketingImages(
  perfumeName: string,
  brand: string,
  description: string
): Promise<Buffer[]> {
  const prompt = `Generate a professional luxury perfume product photography image.
Perfume: "${perfumeName}" by ${brand}.
${description}
Elegant studio setting, pure white background, soft dramatic side lighting, high-end retail aesthetic.
The perfume bottle is the hero — centered, sharp focus. Photorealistic. No text overlays.`;

  const images: Buffer[] = [];

  // Generate 2 images sequentially
  for (let i = 0; i < 2; i++) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const inlineData = (part as { inlineData?: { data?: string; mimeType?: string } }).inlineData;
      if (inlineData?.data) {
        images.push(Buffer.from(inlineData.data, "base64"));
      }
    }
  }

  if (images.length === 0) {
    throw new Error("No images were generated — the model may not support image generation on your plan.");
  }

  return images;
}
