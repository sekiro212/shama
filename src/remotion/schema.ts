import { z } from "zod";

const productSchema = z.object({
  name: z.string(),
  price: z.number(),
  imageUrl: z.string(),
});

export const videoSchema = z.object({
  brandName: z.string(),
  tagline: z.string(),
  brandStory: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  goldColor: z.string(),
  stats: z.object({
    customers: z.number(),
    perfumes: z.number(),
    rating: z.number(),
  }),
  products: z.array(productSchema),
  language: z.enum(["en", "ar"]),
  instagramHandle: z.string(),
  tiktokHandle: z.string(),
});

export type VideoProps = z.infer<typeof videoSchema>;

export const defaultVideoProps: VideoProps = {
  brandName: "Shama",
  tagline: "Discover Your Signature Scent",
  brandStory:
    "Born from a passion for olfactory artistry, Shama represents the perfect harmony between traditional craftsmanship and modern innovation.",
  primaryColor: "#5B8DD9",
  secondaryColor: "#3E6BB5",
  goldColor: "#D4AF37",
  stats: {
    customers: 150,
    perfumes: 100,
    rating: 4.6,
  },
  products: [
    {
      name: "Oud Royale",
      price: 189,
      imageUrl:
        "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400&q=80",
    },
    {
      name: "Rose Blanche",
      price: 145,
      imageUrl:
        "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&q=80",
    },
    {
      name: "Amber Night",
      price: 210,
      imageUrl:
        "https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&q=80",
    },
  ],
  language: "en",
  instagramHandle: "@shama._200",
  tiktokHandle: "@shama_625",
};
