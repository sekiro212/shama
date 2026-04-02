import { Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";

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
    description: "Fetch orders with optional time range and status filter",
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
    name: "get_analytics",
    description:
      "Get store analytics: revenue, top products, low stock, order counts",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "create_product",
    description:
      "Create a new perfume product. Shows confirmation preview before saving.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Product name in English" },
        name_ar: { type: Type.STRING, description: "Product name in Arabic" },
        brand: { type: Type.STRING, description: "Brand/house name" },
        price: { type: Type.NUMBER, description: "Price in LYD" },
        size: { type: Type.STRING, description: "Bottle size e.g. 100ml" },
        gender: { type: Type.STRING, enum: ["men", "women", "unisex"] },
        stock_quantity: { type: Type.NUMBER, description: "Initial stock count" },
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
          description: "Whether samples are available",
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
            gender: { type: Type.STRING, enum: ["men", "women", "unisex"] },
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
