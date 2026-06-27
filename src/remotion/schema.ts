/**
 * ===========================================================================
 * الملف: schema.ts
 * الدور: إعداد مخطّط الخصائص والتحقّق منها (configuration) باستخدام zod.
 * يعرّف بنية خصائص الفيديو (props) التي يستخدمها Remotion للتحقّق ولعرض حقول
 * قابلة للتعديل في الاستوديو، ويشتقّ منها أنواع TypeScript، ويوفّر القيم
 * الافتراضية التي يبدأ بها كل تركيب.
 * ===========================================================================
 */
import { z } from "zod";

// نصّ ثنائي اللغة: حقل en وحقل ar، يُستخدم لأسماء المنتجات.
const bilingualStr = z.object({ en: z.string(), ar: z.string() });

// مخطّط المنتج الواحد: الاسم (ثنائي اللغة)، السعر، سعر العيّنة، ورابط الصورة.
const productSchema = z.object({
  name: bilingualStr,
  price: z.number(),
  samplePrice: z.number(),
  imageUrl: z.string(),
});

/** مخطّط zod لكل خصائص الفيديو، يُمرَّر إلى Composition للتحقّق وتوليد واجهة التحرير. */
export const videoSchema = z.object({
  brandName: z.string(), // اسم العلامة التجارية
  primaryColor: z.string(), // اللون الأساسي للعلامة
  secondaryColor: z.string(), // اللون الثانوي
  goldColor: z.string(), // اللون الذهبي للمسات الفخمة
  blindPrice: z.number(), // سعر الشراء "على العمياني" المستخدم في مشهد المشكلة
  products: z.array(productSchema), // قائمة المنتجات المعروضة
  language: z.enum(["en", "ar"]), // لغة الفيديو
  instagramHandle: z.string(), // معرّف إنستغرام
  tiktokHandle: z.string(), // معرّف تيك توك
});

// نوع خصائص الفيديو، مشتقّ تلقائياً من المخطّط أعلاه.
export type VideoProps = z.infer<typeof videoSchema>;
// نوع المنتج الواحد، مشتقّ من مخطّط المنتج.
export type Product = z.infer<typeof productSchema>;

/** القيم الافتراضية لخصائص الفيديو، تُستخدم كنقطة بداية لكل من النسختين. */
export const defaultVideoProps: VideoProps = {
  brandName: "Shama",
  primaryColor: "#5B8DD9",
  secondaryColor: "#3E6BB5",
  goldColor: "#D4AF37",
  blindPrice: 500,
  products: [
    {
      name: { en: "Oud Royale", ar: "عود رويال" },
      price: 320,
      samplePrice: 18,
      imageUrl: "/video-assets/products/oud-royale.jpg",
    },
    {
      name: { en: "Rose Blanche", ar: "روز بلانش" },
      price: 245,
      samplePrice: 15,
      imageUrl: "/video-assets/products/rose-blanche.jpg",
    },
    {
      name: { en: "Amber Night", ar: "أمبر نايت" },
      price: 380,
      samplePrice: 20,
      imageUrl: "/video-assets/products/amber-night.jpg",
    },
  ],
  language: "en",
  instagramHandle: "@shama._200",
  tiktokHandle: "@shama_625",
};
