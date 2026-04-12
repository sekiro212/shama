import { SAMPLE_SIZES, GENDERS } from "../types";

// OpenAI-compatible tool definitions for OpenRouter
export interface ToolFunction {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const toolDeclarations: ToolFunction[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search perfume products by name or keyword",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_info",
      description: "Get detailed information about a specific product by name or ID",
      parameters: {
        type: "object",
        properties: {
          id_or_name: {
            type: "string",
            description: "Product ID (UUID) or product name",
          },
        },
        required: ["id_or_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_orders",
      description:
        "List orders filtered by time_range and/or status. Use for phrases like 'show orders', 'orders today', 'any new orders', 'pending orders', 'this week's orders'. Returns a LIST of orders. NEVER use this tool to look up ONE specific order by ID — use get_order_by_id for that.",
      parameters: {
        type: "object",
        properties: {
          time_range: {
            type: "string",
            enum: ["today", "week", "month", "all"],
            description: "Time range for orders (default: today)",
          },
          status: {
            type: "string",
            enum: ["pending", "accepted", "returned", "all"],
            description: "Filter by order status (default: all)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_by_id",
      description:
        "Fetch exactly ONE order by its UUID or 8-character short ID. Use this when the admin mentions a specific order id or uses phrases like 'check my order', 'check order abc12345', 'where is order ...', 'order #abc12345 status', or pastes a UUID. Accepts a full UUID (e.g. 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') OR a 6-12 character hex prefix (the bot displays 8-char prefixes in formatted orders). NEVER use get_orders for single-order lookups.",
      parameters: {
        type: "object",
        properties: {
          id_or_short_id: {
            type: "string",
            description:
              "Order UUID or 6-12 character hex prefix (e.g. 'abc12345'). Extract from the admin's message exactly as they wrote it.",
          },
        },
        required: ["id_or_short_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_analytics",
      description:
        "Get store analytics: revenue, top products, low stock, order counts",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_product",
      description:
        "Create a new perfume product. NEVER hallucinate or invent values. Required: name, price, size, gender, stock_quantity — every value MUST come from the admin's own message. If ANY of these five are missing, do NOT call this tool. Instead reply with a short text question listing ONLY the missing fields. After collecting the five required fields, you MUST ask the admin: 'Does this perfume have samples? If yes, what sizes and prices? (e.g., 3ml at 5 LYD, 5ml at 8 LYD)'. If the admin says there are samples, pass them via the `samples` array with size and price. If has_samples is true, the `samples` array MUST be populated.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Product name in English" },
          name_ar: { type: "string", description: "Product name in Arabic" },
          brand: { type: "string", description: "Brand/house name" },
          price: { type: "number", description: "Price in LYD (must be > 0)" },
          size: { type: "string", description: "Bottle size e.g. 100ml" },
          gender: { type: "string", enum: [...GENDERS] },
          stock_quantity: {
            type: "number",
            description: "Initial stock count (non-negative integer)",
          },
          description: {
            type: "string",
            description: "Marketing description in English",
          },
          description_ar: {
            type: "string",
            description: "Marketing description in Arabic",
          },
          has_samples: {
            type: "boolean",
            description:
              "True if this perfume has sample variants for sale. If true, the `samples` array MUST also be provided.",
          },
          samples: {
            type: "array",
            description:
              "Sample variants with size and price. REQUIRED when has_samples is true. Each entry has a valid size from the enum and a positive price.",
            items: {
              type: "object",
              properties: {
                size: {
                  type: "string",
                  enum: [...SAMPLE_SIZES],
                  description: "Sample size — must be one of the 7 allowed values",
                },
                price: {
                  type: "number",
                  description: "Sample price in LYD (must be > 0)",
                },
              },
              required: ["size", "price"],
            },
          },
          fragrance_notes: {
            type: "object",
            description: "Fragrance pyramid",
            properties: {
              top: { type: "array", items: { type: "string" } },
              middle: { type: "array", items: { type: "string" } },
              base: { type: "array", items: { type: "string" } },
            },
          },
        },
        required: ["name", "price", "size", "gender", "stock_quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_product",
      description:
        "Update fields of an existing product. Shows diff preview before saving.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Product UUID" },
          changes: {
            type: "object",
            description: "Fields to update as key-value pairs",
            properties: {
              name: { type: "string" },
              name_ar: { type: "string" },
              brand: { type: "string" },
              price: { type: "number" },
              size: { type: "string" },
              gender: { type: "string", enum: [...GENDERS] },
              stock_quantity: { type: "number" },
              description: { type: "string" },
              description_ar: { type: "string" },
              is_active: { type: "boolean" },
              has_samples: { type: "boolean" },
            },
          },
        },
        required: ["id", "changes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_product",
      description:
        "Delete a product permanently. Shows confirmation before deleting.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Product UUID to delete" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_product_image",
      description:
        "Generate an AI marketing image for a product and save it. Use search_products first to get the product ID. Call this when the admin asks to create/generate/make an image for any product.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Product UUID" },
        },
        required: ["id"],
      },
    },
  },
];
