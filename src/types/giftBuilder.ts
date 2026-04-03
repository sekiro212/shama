// src/types/giftBuilder.ts
import { Product } from "@/services/productsService";

export type GiftOccasion =
  | "birthday"
  | "eid"
  | "anniversary"
  | "wedding"
  | "valentine"
  | "just_because";

export type GiftBoxColor = "black" | "gold" | "white" | "rose_gold";

export type GiftWrappingStyle = "ribbon" | "luxury_tissue" | "luxury_bag";

export type GiftImageStyle = "realistic" | "stylized";

export interface GiftCustomization {
  occasion: GiftOccasion;
  boxColor: GiftBoxColor;
  wrappingStyle: GiftWrappingStyle;
  messageCard: string;
  recipientName: string;
  deliveryDate: string;
}

export interface GiftWizardState {
  step: 1 | 2 | 3 | 4;
  description: string;
  suggestedProducts: Product[];
  selectedProducts: Product[];
  customization: GiftCustomization;
  generatedImageUrl: string;
  imageStyle: GiftImageStyle;
  isGenerating: boolean;
  isPlacingOrder: boolean;
}

export const DEFAULT_CUSTOMIZATION: GiftCustomization = {
  occasion: "birthday",
  boxColor: "gold",
  wrappingStyle: "ribbon",
  messageCard: "",
  recipientName: "",
  deliveryDate: "",
};
