import type {
  BotLanguage,
  PendingConfirmation,
  ProductDraft,
  SampleVariant,
  SampleSize,
  Gender,
  FragranceNotes,
} from "../types";
import { SAMPLE_SIZES, GENDERS, emptyNotes } from "../types";
import {
  searchProducts,
  getProductById,
  getProductByName,
  formatProduct,
  formatUpdateDiff,
} from "../services/products";
import {
  fetchOrders,
  formatOrder,
  getOrderById,
  ORDER_NOT_FOUND,
  ORDER_AMBIGUOUS,
  ORDER_INVALID_ID,
} from "../services/orders";
import { getAnalytics } from "../services/analytics";
import { enrichProductData } from "../services/gemini";
import { UUID_RE } from "../utils/ids";

export interface ToolResult {
  text: string;
  confirmation?: PendingConfirmation;
}

interface ValidatedCreateProductArgs {
  name: string;
  name_ar: string;
  brand: string;
  price: number;
  size: string;
  gender: Gender;
  stock_quantity: number;
  description: string;
  description_ar: string;
  has_samples: boolean;
  samples: SampleVariant[];
  fragrance_notes: FragranceNotes;
}

type ValidationResult =
  | { ok: true; parsed: ValidatedCreateProductArgs }
  | { ok: false; error: string };

// Builder for the instructional VALIDATION_ERROR strings the agent loop
// feeds back to Gemini. Keeps the "Do NOT retry" instruction stable across
// every error path so Gemini always knows to ask the admin instead of
// guessing.
const vErr = (what: string, ask: string): string =>
  `VALIDATION_ERROR: ${what}. Do NOT retry create_product with guessed values. ${ask}`;

/**
 * Pure validator for create_product tool arguments. Exported so unit tests
 * can call it directly with no mocks. On failure, returns an instructional
 * error string that the agent loop feeds back to Gemini as a tool result —
 * Gemini then asks the admin for the missing/invalid fields on the next
 * iteration instead of retrying with guessed values.
 */
export function validateCreateProductArgs(
  args: Record<string, unknown>
): ValidationResult {
  const missing: string[] = [];

  const name = typeof args.name === "string" ? args.name.trim() : "";
  if (!name) missing.push("name");

  const priceRaw = args.price;
  const priceValid =
    typeof priceRaw === "number" && Number.isFinite(priceRaw) && priceRaw > 0;
  if (!priceValid) missing.push("price");

  const size = typeof args.size === "string" ? args.size.trim() : "";
  if (!size) missing.push("size");

  const genderRaw = typeof args.gender === "string" ? args.gender : "";
  if (!(GENDERS as readonly string[]).includes(genderRaw)) {
    missing.push("gender");
  }

  const stockRaw = args.stock_quantity;
  const stockValid =
    typeof stockRaw === "number" &&
    Number.isFinite(stockRaw) &&
    Number.isInteger(stockRaw) &&
    stockRaw >= 0;
  if (!stockValid) missing.push("stock_quantity");

  if (missing.length > 0) {
    return {
      ok: false,
      error: vErr(
        `create_product missing or invalid required field(s): ${missing.join(", ")}`,
        "Reply to the admin with a short text question asking ONLY for these missing fields."
      ),
    };
  }

  // Auto-flip: if the admin provided sample entries but Gemini forgot to set
  // has_samples=true, treat it as has_samples=true rather than dropping them.
  let hasSamples = args.has_samples === true;
  const rawSamples = args.samples;
  const samplesArr = Array.isArray(rawSamples)
    ? (rawSamples as Array<Record<string, unknown>>)
    : null;
  if (!hasSamples && samplesArr && samplesArr.length > 0) {
    hasSamples = true;
  }

  const validatedSamples: SampleVariant[] = [];
  if (hasSamples) {
    if (!samplesArr || samplesArr.length === 0) {
      return {
        ok: false,
        error: vErr(
          "has_samples is true but no samples were provided",
          'Ask the admin: "What sample sizes and prices do you have? (e.g., 3ml at 5 LYD, 5ml at 8 LYD)"'
        ),
      };
    }

    const seenSizes = new Set<string>();
    for (let i = 0; i < samplesArr.length; i++) {
      const s = samplesArr[i];
      const sSize = typeof s.size === "string" ? s.size : "";
      const sPrice = s.price;
      if (!(SAMPLE_SIZES as readonly string[]).includes(sSize)) {
        return {
          ok: false,
          error: vErr(
            `sample #${i + 1} has invalid size "${sSize}". Allowed sizes: ${SAMPLE_SIZES.join(", ")}`,
            "Ask the admin to re-provide valid sample sizes."
          ),
        };
      }
      if (
        typeof sPrice !== "number" ||
        !Number.isFinite(sPrice) ||
        sPrice <= 0
      ) {
        return {
          ok: false,
          error: vErr(
            `sample #${i + 1} has invalid price. Each sample price must be a positive number in LYD`,
            `Ask the admin to re-provide the price for the ${sSize} sample.`
          ),
        };
      }
      if (seenSizes.has(sSize)) {
        return {
          ok: false,
          error: vErr(
            `duplicate sample size "${sSize}". Each sample size can only appear once`,
            "Ask the admin to confirm the sample sizes."
          ),
        };
      }
      seenSizes.add(sSize);
      validatedSamples.push({ size: sSize as SampleSize, price: sPrice });
    }
  }

  const nameAr = typeof args.name_ar === "string" ? args.name_ar : "";
  const brand = typeof args.brand === "string" ? args.brand : "";
  const description =
    typeof args.description === "string" ? args.description : "";
  const descriptionAr =
    typeof args.description_ar === "string" ? args.description_ar : "";

  const rawNotes = args.fragrance_notes as
    | { top?: string[]; middle?: string[]; base?: string[] }
    | undefined;
  const fragranceNotes: FragranceNotes = rawNotes
    ? {
        top: rawNotes.top ?? [],
        middle: rawNotes.middle ?? [],
        base: rawNotes.base ?? [],
      }
    : emptyNotes();

  return {
    ok: true,
    parsed: {
      name,
      name_ar: nameAr,
      brand,
      price: priceRaw as number,
      size,
      gender: genderRaw as Gender,
      stock_quantity: stockRaw as number,
      description,
      description_ar: descriptionAr,
      has_samples: hasSamples,
      samples: validatedSamples,
      fragrance_notes: fragranceNotes,
    },
  };
}

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

    // The id is required: the system prompt instructs the agent to call
    // search_products before update_product / delete_product specifically to
    // get the UUID. Earlier versions stripped it, so the agent could never
    // form a valid update/delete call and looped to MAX_ITERATIONS.
    const lines = results.map(
      (p) =>
        `• id=${p.id} | ${p.name} - ${p.price} LYD (${p.gender}, ${p.size}) [Active: ${
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

  // ── get_order_by_id ──────────────────────────────────────────────────────
  if (toolName === "get_order_by_id") {
    const idOrShortId =
      typeof args.id_or_short_id === "string" ? args.id_or_short_id.trim() : "";
    if (!idOrShortId) {
      return {
        text: "VALIDATION_ERROR: get_order_by_id requires id_or_short_id (non-empty string). Ask the admin which order they want to look up.",
      };
    }

    try {
      const order = await getOrderById(idOrShortId);
      return { text: formatOrder(order, lang) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === ORDER_NOT_FOUND) {
        return { text: `Order not found for: ${idOrShortId}` };
      }
      if (message === ORDER_AMBIGUOUS) {
        return {
          text: `Multiple orders match "${idOrShortId}". Please provide the full UUID.`,
        };
      }
      if (message === ORDER_INVALID_ID) {
        return {
          text: `"${idOrShortId}" doesn't look like a valid order ID. Provide a full UUID or the 8-character short ID shown on the order.`,
        };
      }
      return { text: `Failed to look up order: ${message}` };
    }
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
    const validation = validateCreateProductArgs(args);
    if (!validation.ok) {
      return { text: validation.error };
    }

    const v = validation.parsed;

    // Enrichment runs only after validation passes so a rejected draft never
    // burns a Gemini call.
    let description = v.description;
    let descriptionAr = v.description_ar;
    let nameAr = v.name_ar;
    let fragranceNotes = v.fragrance_notes;
    let fragranceNotesAr: FragranceNotes = emptyNotes();

    if (!description || !fragranceNotes.top.length) {
      const enriched = await enrichProductData(v.name, v.brand);
      if (!description) {
        description = enriched.description;
        descriptionAr = descriptionAr || enriched.description_ar;
      }
      if (!fragranceNotes.top.length) {
        fragranceNotes = enriched.fragrance_notes;
        fragranceNotesAr = enriched.fragrance_notes_ar;
      }
      if (!nameAr) nameAr = enriched.name_ar;
    }

    const draft: ProductDraft = {
      name: v.name,
      name_ar: nameAr,
      brand: v.brand,
      price: v.price,
      size: v.size,
      gender: v.gender,
      stock_quantity: v.stock_quantity,
      description,
      description_ar: descriptionAr,
      has_samples: v.has_samples,
      samples: v.samples,
      fragrance_notes: fragranceNotes,
      fragrance_notes_ar: fragranceNotesAr,
    };

    const notesLine = fragranceNotes.top.length
      ? `\n🌿 Top: ${fragranceNotes.top.join(", ")}\n🌸 Heart: ${fragranceNotes.middle.join(", ")}\n🌰 Base: ${fragranceNotes.base.join(", ")}`
      : "";
    const descLine = description
      ? `\n📝 "${description.slice(0, 100)}${description.length > 100 ? "..." : ""}"`
      : "";
    const arabicName = nameAr && nameAr !== v.name ? ` (${nameAr})` : "";
    const samplesLine =
      v.has_samples && v.samples.length > 0
        ? `\n🧪 Samples:\n${v.samples
            .map((s) => `  • ${s.size} — ${s.price} LYD`)
            .join("\n")}`
        : "";

    const preview = `✨ New product preview:\nName: ${v.name}${arabicName}\nBrand: ${v.brand || "—"}\nPrice: ${v.price} LYD | Size: ${v.size} | Gender: ${v.gender}\nStock: ${v.stock_quantity} | Samples: ${v.has_samples ? "✅" : "❌"}${samplesLine}${notesLine}${descLine}`;

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
