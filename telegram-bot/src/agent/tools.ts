import { Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";
import { SAMPLE_SIZES, GENDERS } from "../types";

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "search_products",
    description: "Search perfume products by name or keyword",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_product_info",
    description: "Get detailed information about a specific product by name or ID",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id_or_name: {
          type: Type.STRING,
          description: "Product ID (UUID) or product name",
        },
      },
      required: ["id_or_name"],
    },
  },
  {
    name: "get_orders",
    description:
      "List orders filtered by time_range and/or status. Use for phrases like 'show orders', 'orders today', 'any new orders', 'pending orders', 'this week's orders'. Returns a LIST of orders. NEVER use this tool to look up ONE specific order by ID — use get_order_by_id for that.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        time_range: {
          type: Type.STRING,
          enum: ["today", "week", "month", "all"],
          description: "Time range for orders (default: today)",
        },
        status: {
          type: Type.STRING,
          enum: ["pending", "accepted", "returned", "all"],
          description: "Filter by order status (default: all)",
        },
      },
    },
  },
  {
    name: "get_order_by_id",
    description:
      "Fetch exactly ONE order by its UUID or 8-character short ID. Use this when the admin mentions a specific order id or uses phrases like 'check my order', 'check order abc12345', 'where is order ...', 'order #abc12345 status', or pastes a UUID. Accepts a full UUID (e.g. 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') OR a 6-12 character hex prefix (the bot displays 8-char prefixes in formatted orders). NEVER use get_orders for single-order lookups.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id_or_short_id: {
          type: Type.STRING,
          description:
            "Order UUID or 6-12 character hex prefix (e.g. 'abc12345'). Extract from the admin's message exactly as they wrote it.",
        },
      },
      required: ["id_or_short_id"],
    },
  },
  {
    name: "get_analytics",
    description:
      "Get store analytics: revenue, top products, low stock, order counts",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "create_product",
    description:
      "Create a new perfume product. NEVER hallucinate or invent values. Required: name, price, size, gender, stock_quantity — every value MUST come from the admin's own message. If ANY of these five are missing, do NOT call this tool. Instead reply with a short text question listing ONLY the missing fields. After collecting the five required fields, you MUST ask the admin: 'Does this perfume have samples? If yes, what sizes and prices? (e.g., 3ml at 5 LYD, 5ml at 8 LYD)'. If the admin says there are samples, pass them via the `samples` array with size and price. If has_samples is true, the `samples` array MUST be populated.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Product name in English" },
        name_ar: { type: Type.STRING, description: "Product name in Arabic" },
        brand: { type: Type.STRING, description: "Brand/house name" },
        price: { type: Type.NUMBER, description: "Price in LYD (must be > 0)" },
        size: { type: Type.STRING, description: "Bottle size e.g. 100ml" },
        gender: { type: Type.STRING, enum: [...GENDERS] },
        stock_quantity: {
          type: Type.NUMBER,
          description: "Initial stock count (non-negative integer)",
        },
        description: {
          type: Type.STRING,
          description: "Marketing description in English",
        },
        description_ar: {
          type: Type.STRING,
          description: "Marketing description in Arabic",
        },
        has_samples: {
          type: Type.BOOLEAN,
          description:
            "True if this perfume has sample variants for sale. If true, the `samples` array MUST also be provided.",
        },
        samples: {
          type: Type.ARRAY,
          description:
            "Sample variants with size and price. REQUIRED when has_samples is true. Each entry has a valid size from the enum and a positive price.",
          items: {
            type: Type.OBJECT,
            properties: {
              size: {
                type: Type.STRING,
                enum: [...SAMPLE_SIZES],
                description: "Sample size — must be one of the 7 allowed values",
              },
              price: {
                type: Type.NUMBER,
                description: "Sample price in LYD (must be > 0)",
              },
            },
            required: ["size", "price"],
          },
        },
        fragrance_notes: {
          type: Type.OBJECT,
          description: "Fragrance pyramid",
          properties: {
            top: { type: Type.ARRAY, items: { type: Type.STRING } },
            middle: { type: Type.ARRAY, items: { type: Type.STRING } },
            base: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
      required: ["name", "price", "size", "gender", "stock_quantity"],
    },
  },
  {
    name: "update_product",
    description:
      "Update fields of an existing product. Shows diff preview before saving.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "Product UUID" },
        changes: {
          type: Type.OBJECT,
          description: "Fields to update as key-value pairs",
          properties: {
            name: { type: Type.STRING },
            name_ar: { type: Type.STRING },
            brand: { type: Type.STRING },
            price: { type: Type.NUMBER },
            size: { type: Type.STRING },
            gender: { type: Type.STRING, enum: [...GENDERS] },
            stock_quantity: { type: Type.NUMBER },
            description: { type: Type.STRING },
            description_ar: { type: Type.STRING },
            is_active: { type: Type.BOOLEAN },
            has_samples: { type: Type.BOOLEAN },
          },
        },
      },
      required: ["id", "changes"],
    },
  },
  {
    name: "delete_product",
    description:
      "Delete a product permanently. Shows confirmation before deleting.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "Product UUID to delete" },
      },
      required: ["id"],
    },
  },
];
