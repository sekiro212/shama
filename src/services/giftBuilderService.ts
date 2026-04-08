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

const WRAPPING_LABELS: Record<string, string> = {
  ribbon: "a satin ribbon bow",
  luxury_tissue: "luxury tissue paper wrapping",
  luxury_bag: "a luxury gift bag",
};

export function buildGiftImagePrompt(
  products: Product[],
  customization: GiftCustomization,
  style: GiftImageStyle
): string {
  const productList = products.map((p) => p.name).join(", ");
  const occasion = OCCASION_LABELS[customization.occasion];
  const boxColor = BOX_COLOR_LABELS[customization.boxColor];
  const wrapping = WRAPPING_LABELS[customization.wrappingStyle];
  const styleDescription =
    style === "realistic"
      ? "photorealistic product photography, clean white background, soft dramatic shadows, luxury brand aesthetic, studio lighting"
      : "warm artistic lifestyle illustration, romantic soft bokeh lighting, luxury brand watercolor and oil style";

  return `A premium luxury perfume gift set for ${occasion}. ${products.length} exquisite perfume bottle${products.length > 1 ? "s" : ""} (${productList}) elegantly arranged in a ${boxColor} gift box with ${wrapping}. The presentation is opulent and sophisticated, worthy of a high-end perfume boutique. ${styleDescription}. Professional high-end retail photography quality.`;
}

export async function placeCustomGiftOrder(params: {
  products: Product[];
  customization: GiftCustomization;
  generatedImageUrl: string;
  imageStyle: GiftImageStyle;
  userId?: string;
}): Promise<string> {
  const totalPrice = params.products.reduce((sum, p) => sum + p.price, 0);

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
      generated_image_url: params.generatedImageUrl,
      image_style: params.imageStyle,
      total_price: totalPrice,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
