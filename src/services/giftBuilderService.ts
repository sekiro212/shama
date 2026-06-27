// src/services/giftBuilderService.ts
/**
 * ===========================================================================
 * ملف: giftBuilderService.ts
 * الغرض: خدمة "بانِي الهدية" المخصّصة.
 * تتولّى مهمتين:
 *   1) بناء نص الوصف (prompt) الذي يُرسل لنموذج توليد الصور لإنشاء صورة هدية واقعية.
 *   2) حفظ طلب الهدية المخصّص في Supabase بعد رفع الصورة المولّدة إلى التخزين.
 * الجداول/الحاويات المرتبطة: جدول custom_gift_orders وحاوية perfume-images.
 * ===========================================================================
 */
import { supabase } from "@/lib/supabase";
import { Product } from "./productsService";
import { GiftCustomization, GiftImageStyle } from "@/types/giftBuilder";

// جداول تحويل القيم المخزّنة (مفاتيح إنجليزية) إلى أوصاف إنجليزية مناسبة لنموذج توليد الصور
// المناسبة (occasion) -> وصفها النصي
const OCCASION_LABELS: Record<string, string> = {
  birthday: "a birthday",
  eid: "an Eid celebration",
  anniversary: "an anniversary",
  wedding: "a wedding",
  valentine: "Valentine's Day",
  just_because: "a special moment",
};

// لون الصندوق -> اسمه الوصفي
const BOX_COLOR_LABELS: Record<string, string> = {
  black: "matte black",
  gold: "gold",
  white: "elegant white",
  rose_gold: "rose gold",
};

// لون الصندوق -> قيمته الست عشرية (hex) لإرشاد النموذج إلى اللون الدقيق
const BOX_COLOR_HEX: Record<string, string> = {
  black: "#1a1a1a",
  gold: "#D4AF37",
  white: "#f0f0f0",
  rose_gold: "#B76E79",
};

// أسلوب التغليف -> وصفه النصي
const WRAPPING_LABELS: Record<string, string> = {
  ribbon: "a satin ribbon bow",
  luxury_tissue: "luxury tissue paper wrapping",
  luxury_bag: "a luxury gift bag",
};

// لون الصندوق -> وصف خامة سطحه وانعكاساته لزيادة واقعية الصورة المولّدة
const BOX_MATERIAL_DESCRIPTION: Record<string, string> = {
  black: "deep matte black lacquered surface with subtle specular highlights",
  gold: "lustrous gold metallic surface with brilliant reflections and warm sheen",
  white: "pristine white glossy surface with clean soft-box reflections",
  rose_gold: "elegant rose gold metallic surface with warm pink-copper reflections",
};

/**
 * بناء نص الوصف (prompt) الذي يُرسل لنموذج توليد الصور لإنشاء صورة الهدية.
 * يجمع بين أسماء المنتجات وخيارات التخصيص (المناسبة واللون والتغليف) والأسلوب المطلوب.
 * @param products قائمة منتجات العطور المختارة لتظهر داخل صندوق الهدية.
 * @param customization خيارات التخصيص (المناسبة، لون الصندوق، التغليف، الرسالة، اسم المستلم...).
 * @param style أسلوب الصورة: واقعي (realistic) أو رسومي فنّي (stylized).
 * @returns نص الوصف الكامل الجاهز لإرساله إلى نموذج توليد الصور.
 */
export function buildGiftImagePrompt(
  products: Product[],
  customization: GiftCustomization,
  style: GiftImageStyle
): string {
  // تحويل خيارات التخصيص (المخزّنة كمفاتيح) إلى أوصافها النصية عبر جداول التحويل أعلاه
  const productList = products.map((p) => p.name).join(", ");
  const occasion = OCCASION_LABELS[customization.occasion];
  const boxColor = BOX_COLOR_LABELS[customization.boxColor];
  const boxHex = BOX_COLOR_HEX[customization.boxColor];
  const boxMaterial = BOX_MATERIAL_DESCRIPTION[customization.boxColor];
  const wrapping = WRAPPING_LABELS[customization.wrappingStyle];

  // اختيار وصف الأسلوب والإضاءة بناءً على النمط المطلوب (واقعي مقابل رسومي فنّي)
  const styleDescription =
    style === "realistic"
      ? "Octane render quality, ray-traced shadows, ambient occlusion, global illumination, physically-based rendering, ultra-sharp product detail, luxury brand editorial photography"
      : "warm painterly lifestyle illustration, impressionist oil painting technique, warm golden-hour bokeh, rich textured brushwork, luxury brand watercolor and gouache style";

  const lightingDescription =
    style === "realistic"
      ? "volumetric three-point studio lighting, key light from upper-left with golden warmth, rim light creating depth separation, soft fill light eliminating harsh shadows, specular highlights on all reflective surfaces, subsurface scattering on ribbons and tissue"
      : "soft diffused window light, warm golden-hour glow, gentle shadows with rich color bleeding";

  let prompt = `Award-winning luxury perfume gift photography for a high-end boutique campaign. The scene features ${products.length} premium perfume bottle${products.length > 1 ? "s" : ""} (${productList}) — faithfully recreate the exact bottle shapes, colors, and label designs from the reference images provided — arranged inside an open ${boxColor} (hex ${boxHex}) gift box with ${boxMaterial}, adorned with ${wrapping}. This is a gift for ${occasion}. Lighting: ${lightingDescription}. Camera: medium format camera, 85mm portrait lens, f/2.8 aperture, dramatic shallow depth of field with creamy bokeh, 45-degree elevated three-quarter view showing both the box interior depth and the perfume bottles. Surface: soft neutral warm linen or Italian marble. Depth cues: foreground micro-details in sharp focus, layered depth, strong cast shadows that anchor objects to the surface, specular micro-highlights on glass and ribbon. Style: ${styleDescription}. Every bottle label is clearly readable, gift presentation looks museum-quality. Ultra-high resolution, Vogue editorial production values, magazine cover photography.`;

  // إضافات اختيارية للنص: بطاقة باسم المستلم وبطاقة رسالة، تُضاف فقط إن وُجدت قيمها
  if (customization.recipientName) {
    prompt += ` Include a small elegant handwritten gift tag resting against the box reading "To: ${customization.recipientName}" — the tag casts a soft shadow.`;
  }

  if (customization.messageCard) {
    prompt += ` Place a partially-open premium greeting card in the scene showing the handwritten-style inscription: "${customization.messageCard}" — soft shadow from the card adds depth.`;
  }

  return prompt;
}

/**
 * رفع صورة الهدية المولّدة (بصيغة base64) إلى تخزين Supabase وإرجاع رابطها العام.
 * @param base64DataUrl الصورة بصيغة data URL مشفّرة بـ base64.
 * @returns رابط الصورة العام بعد الرفع، أو نفس الـ data URL الأصلي عند الفشل (كحل احتياطي).
 */
async function uploadGiftImage(base64DataUrl: string): Promise<string> {
  // استخراج نوع الـ MIME ومحتوى base64 من الـ data URL؛ إن لم يطابق النمط يُعاد النص كما هو
  const match = base64DataUrl.match(/^data:(\w+\/\w+);base64,(.+)$/s);
  if (!match) return base64DataUrl;

  const [, mimeType, base64] = match;
  const ext = mimeType.split("/")[1] ?? "png";
  // اسم ملف فريد باستخدام الطابع الزمني وجزء عشوائي لتجنّب التعارض
  const fileName = `gifts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // فكّ تشفير base64 إلى بايتات خام (Uint8Array) لرفعها كملف ثنائي
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const { error } = await supabase.storage
    .from("perfume-images")
    .upload(fileName, bytes, { contentType: mimeType, upsert: false });

  if (error) {
    console.error("Gift image upload failed:", error);
    return base64DataUrl; // حل احتياطي: إعادة الـ data URL كي يُحفظ الطلب رغم فشل الرفع
  }

  // الحصول على الرابط العام للملف المرفوع لتخزينه مع الطلب
  const { data } = supabase.storage.from("perfume-images").getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * إنشاء وحفظ طلب هدية مخصّص في قاعدة البيانات.
 * يحسب السعر الإجمالي، يرفع الصورة المولّدة إن لزم، ثم يُدرج الطلب في جدول custom_gift_orders.
 * @param params المنتجات المختارة، خيارات التخصيص، رابط الصورة المولّدة، أسلوبها، ومعرّف المستخدم (اختياري).
 * @returns معرّف (id) الطلب الذي تم إنشاؤه.
 */
export async function placeCustomGiftOrder(params: {
  products: Product[];
  customization: GiftCustomization;
  generatedImageUrl: string;
  imageStyle: GiftImageStyle;
  userId?: string;
}): Promise<string> {
  // السعر الإجمالي = مجموع أسعار المنتجات المختارة
  const totalPrice = params.products.reduce((sum, p) => sum + p.price, 0);

  // إذا كانت الصورة بصيغة base64 تُرفع أولًا إلى التخزين ليتمكّن المسؤول من عرضها كرابط عادي
  const imageUrl = params.generatedImageUrl.startsWith("data:image/")
    ? await uploadGiftImage(params.generatedImageUrl)
    : params.generatedImageUrl;

  const { data, error } = await supabase
    .from("custom_gift_orders")
    .insert({
      user_id: params.userId ?? null,
      // تخزين لقطة مبسّطة من بيانات كل منتج (id, name, price, image) داخل عمود JSONB
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
