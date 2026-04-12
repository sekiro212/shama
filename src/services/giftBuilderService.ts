// src/services/giftBuilderService.ts
import { supabase } from "@/lib/supabase";
import { Product } from "./productsService";
import { GiftCustomization, GiftImageStyle } from "@/types/giftBuilder";

const OCCASION_LABELS: Record<string, string> = {
  birthday: "a birthday",
  eid: "an Eid celebration",
  anniversary: "an anniversary",
  wedding: "a wedding",
  valentine: "Valentine's Day",
  just_because: "a special moment",
};

const BOX_COLOR_LABELS: Record<string, string> = {
  black: "matte black",
  gold: "gold",
  white: "elegant white",
  rose_gold: "rose gold",
};

const BOX_COLOR_HEX: Record<string, string> = {
  black: "#1a1a1a",
  gold: "#D4AF37",
  white: "#f0f0f0",
  rose_gold: "#B76E79",
};

const WRAPPING_LABELS: Record<string, string> = {
  ribbon: "a satin ribbon bow",
  luxury_tissue: "luxury tissue paper wrapping",
  luxury_bag: "a luxury gift bag",
};

const BOX_MATERIAL_DESCRIPTION: Record<string, string> = {
  black: "deep matte black lacquered surface with subtle specular highlights",
  gold: "lustrous gold metallic surface with brilliant reflections and warm sheen",
  white: "pristine white glossy surface with clean soft-box reflections",
  rose_gold: "elegant rose gold metallic surface with warm pink-copper reflections",
};

export function buildGiftImagePrompt(
  products: Product[],
  customization: GiftCustomization,
  style: GiftImageStyle
): string {
  const productList = products.map((p) => p.name).join(", ");
  const occasion = OCCASION_LABELS[customization.occasion];
  const boxColor = BOX_COLOR_LABELS[customization.boxColor];
  const boxHex = BOX_COLOR_HEX[customization.boxColor];
  const boxMaterial = BOX_MATERIAL_DESCRIPTION[customization.boxColor];
  const wrapping = WRAPPING_LABELS[customization.wrappingStyle];

  const styleDescription =
    style === "realistic"
      ? "Octane render quality, ray-traced shadows, ambient occlusion, global illumination, physically-based rendering, ultra-sharp product detail, luxury brand editorial photography"
      : "warm painterly lifestyle illustration, impressionist oil painting technique, romantic golden-hour bokeh, rich textured brushwork, luxury brand watercolor and gouache style";

  const lightingDescription =
    style === "realistic"
      ? "volumetric three-point studio lighting, key light from upper-left with golden warmth, rim light creating depth separation, soft fill light eliminating harsh shadows, specular highlights on all reflective surfaces, subsurface scattering on ribbons and tissue"
      : "soft diffused window light, warm golden-hour glow, gentle shadows with rich color bleeding";

  let prompt = `Award-winning luxury perfume gift photography for a high-end boutique campaign. The scene features ${products.length} premium perfume bottle${products.length > 1 ? "s" : ""} (${productList}) — faithfully recreate the exact bottle shapes, colors, and label designs from the reference images provided — arranged inside an open ${boxColor} (hex ${boxHex}) gift box with ${boxMaterial}, adorned with ${wrapping}. This is a gift for ${occasion}. Lighting: ${lightingDescription}. Camera: medium format camera, 85mm portrait lens, f/2.8 aperture, dramatic shallow depth of field with creamy bokeh, 45-degree elevated three-quarter view showing both the box interior depth and the perfume bottles. Surface: soft neutral warm linen or Italian marble. Depth cues: foreground micro-details in sharp focus, layered depth, strong cast shadows that anchor objects to the surface, specular micro-highlights on glass and ribbon. Style: ${styleDescription}. Every bottle label is clearly readable, gift presentation looks museum-quality. Ultra-high resolution, Vogue editorial production values, magazine cover photography.`;

  if (customization.recipientName) {
    prompt += ` Include a small elegant handwritten gift tag resting against the box reading "To: ${customization.recipientName}" — the tag casts a soft shadow.`;
  }

  if (customization.messageCard) {
    prompt += ` Place a partially-open premium greeting card in the scene showing the handwritten-style inscription: "${customization.messageCard}" — soft shadow from the card adds depth.`;
  }

  return prompt;
}

async function uploadGiftImage(base64DataUrl: string): Promise<string> {
  const match = base64DataUrl.match(/^data:(\w+\/\w+);base64,(.+)$/s);
  if (!match) return base64DataUrl;

  const [, mimeType, base64] = match;
  const ext = mimeType.split("/")[1] ?? "png";
  const fileName = `gifts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const { error } = await supabase.storage
    .from("perfume-images")
    .upload(fileName, bytes, { contentType: mimeType, upsert: false });

  if (error) {
    console.error("Gift image upload failed:", error);
    return base64DataUrl; // fall back so order still saves
  }

  const { data } = supabase.storage.from("perfume-images").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function placeCustomGiftOrder(params: {
  products: Product[];
  customization: GiftCustomization;
  generatedImageUrl: string;
  imageStyle: GiftImageStyle;
  userId?: string;
}): Promise<string> {
  const totalPrice = params.products.reduce((sum, p) => sum + p.price, 0);

  // Upload base64 image to Storage so admin can display it as a normal URL
  const imageUrl = params.generatedImageUrl.startsWith("data:image/")
    ? await uploadGiftImage(params.generatedImageUrl)
    : params.generatedImageUrl;

  const { data, error } = await supabase
    .from("custom_gift_orders")
    .insert({
      user_id: params.userId ?? null,
      products: params.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.images?.[0]?.image_url ?? null,
      })),
      occasion: params.customization.occasion,
      box_color: params.customization.boxColor,
      wrapping_style: params.customization.wrappingStyle,
      message_card: params.customization.messageCard || null,
      recipient_name: params.customization.recipientName || null,
      delivery_date: params.customization.deliveryDate || null,
      generated_image_url: imageUrl,
      image_style: params.imageStyle,
      total_price: totalPrice,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
