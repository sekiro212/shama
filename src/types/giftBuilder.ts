// src/types/giftBuilder.ts
/**
 * ===========================================================================
 * ملف: giftBuilder.ts (أنواع TypeScript)
 * الغرض: تعريف الأنواع والثوابت الخاصة بميزة "بانِي الهدية" المخصّصة.
 * يشمل: أنواع المناسبة ولون الصندوق وأسلوب التغليف وأسلوب الصورة،
 * وحالة معالج الخطوات (wizard)، وكائن التخصيص الافتراضي.
 * ===========================================================================
 */
import { Product } from "@/services/productsService";

// المناسبة التي تُهدى من أجلها (عيد ميلاد، عيد، ذكرى سنوية... إلخ)
export type GiftOccasion =
  | "birthday"
  | "eid"
  | "anniversary"
  | "wedding"
  | "valentine"
  | "just_because";

// لون صندوق الهدية
export type GiftBoxColor = "black" | "gold" | "white" | "rose_gold";

// أسلوب تغليف الهدية
export type GiftWrappingStyle = "ribbon" | "luxury_tissue" | "luxury_bag";

// أسلوب الصورة المولّدة: واقعي أو رسومي فنّي
export type GiftImageStyle = "realistic" | "stylized";

// خيارات تخصيص الهدية التي يحدّدها المستخدم
export interface GiftCustomization {
  occasion: GiftOccasion;
  boxColor: GiftBoxColor;
  wrappingStyle: GiftWrappingStyle;
  messageCard: string;
  recipientName: string;
  deliveryDate: string;
}

// حالة معالج الخطوات (wizard) الذي يقود المستخدم عبر مراحل بناء الهدية
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

// القيم الافتراضية لتخصيص الهدية عند بدء المعالج
export const DEFAULT_CUSTOMIZATION: GiftCustomization = {
  occasion: "birthday",
  boxColor: "gold",
  wrappingStyle: "ribbon",
  messageCard: "",
  recipientName: "",
  deliveryDate: "",
};
