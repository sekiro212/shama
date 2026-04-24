import { z } from "zod";

const bilingualStr = z.object({ en: z.string(), ar: z.string() });

const productSchema = z.object({
  name: bilingualStr,
  price: z.number(),
  samplePrice: z.number(),
  imageUrl: z.string(),
});

export const videoSchema = z.object({
  brandName: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  goldColor: z.string(),
  blindPrice: z.number(),
  products: z.array(productSchema),
  language: z.enum(["en", "ar"]),
  instagramHandle: z.string(),
  tiktokHandle: z.string(),
});

export type VideoProps = z.infer<typeof videoSchema>;
export type Product = z.infer<typeof productSchema>;

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
