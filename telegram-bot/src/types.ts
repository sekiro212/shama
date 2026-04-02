import type { Content } from "@google/genai";
import { z } from "zod";

// ─── Core Domain Types ───

export interface FragranceNotes {
  top: string[];
  middle: string[];
  base: string[];
}

export interface SampleVariant {
  size: string;
  price: number;
}

export type BotLanguage = "en" | "ar";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
  image: string;
}

// ─── Product Draft ───

export interface ProductDraft {
  name: string;
  name_ar: string;
  brand: string;
  description: string;
  description_ar: string;
  fragrance_notes: FragranceNotes;
  fragrance_notes_ar: FragranceNotes;
  price: number;
  size: string;
  gender: "men" | "women" | "unisex";
  stock_quantity: number;
  has_samples: boolean;
  samples: SampleVariant[];
  imageBuffer?: Buffer;
  imageMimeType?: string;
  telegramFileId?: string;  // legacy field — used by old wizard, removed in Phase 5
}

// ─── Pending Confirmation ───

export type PendingConfirmation =
  | { type: "create"; payload: ProductDraft; preview: string }
  | {
      type: "update";
      payload: { id: string; name: string; changes: Record<string, unknown>; diff: string };
      preview: string;
    }
  | { type: "delete"; payload: { id: string; name: string }; preview: string };

// ─── Session (3 fields) ───

export interface BotSession {
  history: Content[];
  confirmation: PendingConfirmation | null;
  language?: BotLanguage;  // "en" | "ar", defaults to "en"
}

// ─── Zod Tool Argument Schemas ───

export const CreateProductSchema = z.object({
  name: z.string().min(1),
  name_ar: z.string().optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  price: z.number().positive(),
  size: z.string().min(1),
  gender: z.enum(["men", "women", "unisex"]),
  stock_quantity: z.number().int().min(0),
  has_samples: z.boolean().optional().default(false),
  samples: z.array(z.object({
    size: z.string().min(1),
    price: z.number().positive(),
  })).optional().default([]),
  fragrance_notes: z
    .object({
      top: z.array(z.string()),
      middle: z.array(z.string()),
      base: z.array(z.string()),
    })
    .optional(),
});

export const UpdateProductSchema = z.object({
  id: z.string().uuid(),
  changes: z.record(z.string(), z.unknown()),
});

export const DeleteProductSchema = z.object({
  id: z.string().uuid(),
});

export const SearchProductsSchema = z.object({
  query: z.string().min(1),
});

export const GetProductInfoSchema = z.object({
  id_or_name: z.string().min(1),
});

export const GetOrdersSchema = z.object({
  time_range: z
    .enum(["today", "week", "month", "all"])
    .optional()
    .default("today"),
  status: z
    .enum(["pending", "accepted", "returned", "all"])
    .optional()
    .default("all"),
});

// ─── Inferred Types from Schemas ───

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type DeleteProductInput = z.infer<typeof DeleteProductSchema>;
export type SearchProductsInput = z.infer<typeof SearchProductsSchema>;
export type GetProductInfoInput = z.infer<typeof GetProductInfoSchema>;
export type GetOrdersInput = z.infer<typeof GetOrdersSchema>;

// ─── Migration bridges — remove in Phase 5 ───
// These keep old files compiling while they await migration
export type AIAction = {
  type: "create" | "update" | "delete" | "orders" | "search" | "info";
  productName?: string;
  productId?: string;
  changes?: Record<string, unknown>;
  createData?: Partial<ProductDraft>;
  ordersHours?: number;
  searchQuery?: string;
  confirmed?: boolean;
};

export interface BotSessionData {
  language?: BotLanguage;
  draft?: Partial<ProductDraft>;
  awaitingTextFor?: string;
  pendingSampleSizes?: string[];
  currentSampleIndex?: number;
  collectingSamplePrices?: boolean;
  skipImageGeneration?: boolean;
  awaitingPhoto?: boolean;
  pendingCreateData?: Partial<ProductDraft>;
  aiTriggeredCreate?: boolean;
  pendingUpdateAction?: AIAction;
  updateStep?: "preview" | "changes" | "continue";
  pendingDeleteAction?: AIAction;
  pendingDestructiveActions?: AIAction[];
  currentDestructiveIndex?: number;
  updateProductId?: string;
  updateProductName?: string;
  deleteProductId?: string;
  pendingActions?: AIAction[];
  // New fields for agent architecture
  history?: import("@google/genai").Content[];
  confirmation?: PendingConfirmation | null;
}
