import type { BotLanguage, PendingConfirmation, ProductDraft } from "../types";
import {
  searchProducts,
  getProductById,
  getProductByName,
  formatProduct,
  formatUpdateDiff,
} from "../services/products";
import { fetchOrders, formatOrder } from "../services/orders";
import { getAnalytics } from "../services/analytics";

export interface ToolResult {
  text: string;
  confirmation?: PendingConfirmation;
}

// UUID pattern check
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  lang: BotLanguage
): Promise<ToolResult> {
  // ── search_products ─────────────────────────────────────────────────────
  if (toolName === "search_products") {
    if (typeof args.query !== "string" || !args.query) {
      return { text: "Error: search query must be a non-empty string" };
    }
    const query = args.query as string;
    const results = await searchProducts(query);

    if (results.length === 0) {
      return { text: `No products found for: ${query}` };
    }

    const lines = results.map(
      (p) =>
        `• ${p.name} - ${p.price} LYD (${p.gender}, ${p.size}) [Active: ${
          p.is_active ? "✅" : "❌"
        }]`
    );
    return { text: `Found ${results.length} products:\n${lines.join("\n")}` };
  }

  // ── get_product_info ─────────────────────────────────────────────────────
  if (toolName === "get_product_info") {
    const idOrName = args.id_or_name as string;

    // Try by name first; fall back to UUID lookup
    let product = await getProductByName(idOrName);
    if (!product && UUID_RE.test(idOrName)) {
      try {
        product = await getProductById(idOrName);
      } catch {
        product = null;
      }
    }

    if (!product) {
      return { text: `Product not found: ${idOrName}` };
    }

    return { text: formatProduct(product, lang) };
  }

  // ── get_orders ───────────────────────────────────────────────────────────
  if (toolName === "get_orders") {
    const timeRange = (args.time_range as "today" | "week" | "month" | "all") ?? "today";
    const status = (args.status as string) ?? "all";

    const orders = await fetchOrders({ timeRange, status });

    if (orders.length === 0) {
      return { text: "No orders found." };
    }

    const formatted = orders.map((o) => formatOrder(o, lang)).join("\n---\n");
    return { text: formatted };
  }

  // ── get_analytics ────────────────────────────────────────────────────────
  if (toolName === "get_analytics") {
    const data = await getAnalytics();

    const topLines = data.topProducts
      .map((p, i) => `${i + 1}. ${p.name} (${p.orderCount} units)`)
      .join("\n");

    const lowLines = data.lowStockItems
      .map((p) => `• ${p.name}: ${p.stock} units`)
      .join("\n");

    const text = [
      `📊 Analytics (last 30 days):`,
      `Revenue: ${data.totalRevenue} LYD | Orders: ${data.orderCount}`,
      `Avg order: ${data.avgOrderValue.toFixed(2)} LYD | Pending: ${data.pendingOrderCount}`,
      ``,
      `🏆 Top Products:`,
      topLines || "None",
      ``,
      `⚠️ Low Stock:`,
      lowLines || "None",
    ].join("\n");

    return { text };
  }

  // ── create_product ───────────────────────────────────────────────────────
  if (toolName === "create_product") {
    if (typeof args.name !== "string" || typeof args.price !== "number") {
      return { text: "Error: create_product requires name (string) and price (number)" };
    }
    const rawNotes = args.fragrance_notes as
      | { top?: string[]; middle?: string[]; base?: string[] }
      | undefined;

    const fragranceNotes = rawNotes
      ? {
          top: rawNotes.top ?? [],
          middle: rawNotes.middle ?? [],
          base: rawNotes.base ?? [],
        }
      : { top: [], middle: [], base: [] };

    const draft: ProductDraft = {
      name: args.name as string,
      name_ar: (args.name_ar as string | undefined) ?? "",
      brand: (args.brand as string | undefined) ?? "",
      price: args.price as number,
      size: args.size as string,
      gender: args.gender as "men" | "women" | "unisex",
      stock_quantity: args.stock_quantity as number,
      description: (args.description as string | undefined) ?? "",
      description_ar: (args.description_ar as string | undefined) ?? "",
      has_samples: (args.has_samples as boolean | undefined) ?? false,
      samples: [],
      fragrance_notes: fragranceNotes,
      fragrance_notes_ar: fragranceNotes, // Arabic notes not exposed in tool API; defaults to English notes
    };

    const notesSummary =
      fragranceNotes.top.length > 0
        ? `\nNotes — Top: ${fragranceNotes.top.join(", ")} | Heart: ${fragranceNotes.middle.join(", ")} | Base: ${fragranceNotes.base.join(", ")}`
        : "";

    const preview = [
      `✨ New product preview:`,
      `Name: ${draft.name}${draft.name_ar ? ` / ${draft.name_ar}` : ""}`,
      `Brand: ${draft.brand || "—"}`,
      `Price: ${draft.price} LYD | Size: ${draft.size} | Gender: ${draft.gender}`,
      `Stock: ${draft.stock_quantity} | Samples: ${draft.has_samples ? "✅" : "❌"}`,
      draft.description ? `Description: ${draft.description.slice(0, 100)}${draft.description.length > 100 ? "..." : ""}` : "",
      notesSummary,
    ]
      .filter(Boolean)
      .join("\n");

    const confirmation: PendingConfirmation = {
      type: "create",
      payload: draft,
      preview,
    };

    return { text: "create_product queued", confirmation };
  }

  // ── update_product ───────────────────────────────────────────────────────
  if (toolName === "update_product") {
    if (typeof args.id !== "string" || typeof args.changes !== "object") {
      return { text: "Error: update_product requires id (string) and changes (object)" };
    }
    const id = args.id as string;
    const changes = args.changes as Record<string, unknown>;

    try {
      const product = await getProductById(id);
      const diff = formatUpdateDiff(product, changes, lang);

      const preview = [
        `✏️ Update "${product.name}":`,
        diff,
      ].join("\n");

      const confirmation: PendingConfirmation = {
        type: "update",
        payload: { id, name: product.name, changes, diff },
        preview,
      };

      return { text: "update_product queued", confirmation };
    } catch (err) {
      return { text: `Product not found or error: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  // ── delete_product ───────────────────────────────────────────────────────
  if (toolName === "delete_product") {
    if (typeof args.id !== "string") {
      return { text: "Error: delete_product requires id (string)" };
    }
    const id = args.id as string;

    try {
      const product = await getProductById(id);

      const preview = `⚠️ Delete "${product.name}"? (${product.stock_quantity} units in stock)`;

      const confirmation: PendingConfirmation = {
        type: "delete",
        payload: { id, name: product.name },
        preview,
      };

      return { text: "delete_product queued", confirmation };
    } catch (err) {
      return { text: `Product not found or error: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  // ── unknown ──────────────────────────────────────────────────────────────
  throw new Error(`Unknown tool: ${toolName}`);
}
