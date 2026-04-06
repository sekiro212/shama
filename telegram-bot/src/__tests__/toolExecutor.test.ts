import { describe, it, expect, vi, beforeEach } from "vitest";

// `../config` is mocked globally in src/__tests__/_setup.ts.
vi.mock("../services/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("../services/gemini", () => ({
  enrichProductData: vi.fn(async () => ({
    description: "mocked-description",
    description_ar: "mocked-description-ar",
    fragrance_notes: { top: ["bergamot"], middle: ["rose"], base: ["amber"] },
    fragrance_notes_ar: { top: ["برغموت"], middle: ["ورد"], base: ["عنبر"] },
    name_ar: "اسم-تجريبي",
  })),
  analyzeImage: vi.fn(),
}));

vi.mock("../services/orders", async () => {
  const actual = await vi.importActual<typeof import("../services/orders")>(
    "../services/orders"
  );
  return {
    ...actual,
    fetchOrders: vi.fn(),
    getOrderById: vi.fn(),
  };
});

vi.mock("../services/products", () => ({
  searchProducts: vi.fn(),
  getProductById: vi.fn(),
  getProductByName: vi.fn(),
  formatProduct: vi.fn(() => "formatted product"),
  formatUpdateDiff: vi.fn(() => "diff"),
}));

vi.mock("../services/analytics", () => ({
  getAnalytics: vi.fn(),
}));

// ─── Imports under test (after mocks) ─────────────────────────────────────
import {
  validateCreateProductArgs,
  executeTool,
} from "../agent/toolExecutor";
import {
  ORDER_NOT_FOUND,
  ORDER_AMBIGUOUS,
  ORDER_INVALID_ID,
  fetchOrders,
  getOrderById,
  type Order,
} from "../services/orders";
import { enrichProductData } from "../services/gemini";

function validArgs(extra: Record<string, unknown> = {}) {
  return {
    name: "Sauvage",
    price: 250,
    size: "100ml",
    gender: "men",
    stock_quantity: 20,
    ...extra,
  };
}

// Asserts the validator failed and the error message mentions every needle.
// Replaces ~15 copies of `expect(r.ok).toBe(false); if (r.ok) return; expect(r.error).toContain(...)`.
function expectErr(
  r: ReturnType<typeof validateCreateProductArgs>,
  ...needles: string[]
): void {
  expect(r.ok).toBe(false);
  if (r.ok) throw new Error("expected validation to fail");
  for (const n of needles) expect(r.error).toContain(n);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════
// validateCreateProductArgs — pure unit tests, no async, no mocks needed
// ═════════════════════════════════════════════════════════════════════════
describe("validateCreateProductArgs — required field rules", () => {
  it("rejects when only name is provided (4 missing)", () => {
    expectErr(
      validateCreateProductArgs({ name: "X" }),
      "VALIDATION_ERROR",
      "price",
      "size",
      "gender",
      "stock_quantity"
    );
  });

  it("rejects when name is missing", () => {
    expectErr(
      validateCreateProductArgs({
        price: 100,
        size: "50ml",
        gender: "women",
        stock_quantity: 5,
      }),
      "name"
    );
  });

  it("rejects when name is empty string", () => {
    expectErr(validateCreateProductArgs(validArgs({ name: "   " })), "name");
  });

  it("rejects when size is missing", () => {
    expectErr(validateCreateProductArgs(validArgs({ size: undefined })), "size");
  });

  it("rejects when gender is missing", () => {
    expectErr(validateCreateProductArgs(validArgs({ gender: undefined })), "gender");
  });

  it("rejects when gender is wrong case", () => {
    expectErr(validateCreateProductArgs(validArgs({ gender: "Men" })), "gender");
  });

  it("rejects when gender is invalid value", () => {
    expectErr(validateCreateProductArgs(validArgs({ gender: "male" })), "gender");
  });

  it("rejects when stock_quantity is missing", () => {
    expectErr(
      validateCreateProductArgs(validArgs({ stock_quantity: undefined })),
      "stock_quantity"
    );
  });

  it("rejects when stock_quantity is negative", () => {
    expectErr(
      validateCreateProductArgs(validArgs({ stock_quantity: -1 })),
      "stock_quantity"
    );
  });

  it("rejects when stock_quantity is non-integer", () => {
    expectErr(
      validateCreateProductArgs(validArgs({ stock_quantity: 2.5 })),
      "stock_quantity"
    );
  });

  it("rejects when price is missing", () => {
    expectErr(validateCreateProductArgs(validArgs({ price: undefined })), "price");
  });

  it("rejects when price is a string '45' (Gemini hallucination)", () => {
    expectErr(validateCreateProductArgs(validArgs({ price: "45" })), "price");
  });

  it("rejects when price is zero", () => {
    expectErr(validateCreateProductArgs(validArgs({ price: 0 })), "price");
  });

  it("rejects when price is NaN", () => {
    expectErr(validateCreateProductArgs(validArgs({ price: NaN })), "price");
  });

  it("accepts a fully valid arg set with no samples", () => {
    const r = validateCreateProductArgs(validArgs());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parsed.name).toBe("Sauvage");
    expect(r.parsed.price).toBe(250);
    expect(r.parsed.size).toBe("100ml");
    expect(r.parsed.gender).toBe("men");
    expect(r.parsed.stock_quantity).toBe(20);
    expect(r.parsed.has_samples).toBe(false);
    expect(r.parsed.samples).toEqual([]);
  });

  it("instructional error tells Gemini NOT to retry and to ask the admin", () => {
    expectErr(
      validateCreateProductArgs({ name: "X" }),
      "Do NOT retry",
      "ask"
    );
  });
});

describe("validateCreateProductArgs — samples rules", () => {
  it("rejects when has_samples=true and samples missing", () => {
    expectErr(
      validateCreateProductArgs(validArgs({ has_samples: true })),
      "has_samples is true but no samples"
    );
  });

  it("rejects when has_samples=true and samples=[]", () => {
    expectErr(
      validateCreateProductArgs(validArgs({ has_samples: true, samples: [] })),
      "no samples"
    );
  });

  it("rejects when sample size is invalid (7ml)", () => {
    expectErr(
      validateCreateProductArgs(
        validArgs({
          has_samples: true,
          samples: [{ size: "7ml", price: 5 }],
        })
      ),
      "invalid size",
      "7ml"
    );
  });

  it("rejects when sample size is 50ml (a valid bottle size but not a sample size)", () => {
    expectErr(
      validateCreateProductArgs(
        validArgs({
          has_samples: true,
          samples: [{ size: "50ml", price: 5 }],
        })
      ),
      "50ml"
    );
  });

  it("rejects when sample price is zero", () => {
    expectErr(
      validateCreateProductArgs(
        validArgs({
          has_samples: true,
          samples: [{ size: "3ml", price: 0 }],
        })
      ),
      "invalid price"
    );
  });

  it("rejects when sample price is negative", () => {
    expectErr(
      validateCreateProductArgs(
        validArgs({
          has_samples: true,
          samples: [{ size: "3ml", price: -1 }],
        })
      ),
      "invalid price"
    );
  });

  it("rejects duplicate sample sizes", () => {
    expectErr(
      validateCreateProductArgs(
        validArgs({
          has_samples: true,
          samples: [
            { size: "3ml", price: 5 },
            { size: "3ml", price: 8 },
          ],
        })
      ),
      "duplicate sample size"
    );
  });

  it("accepts has_samples=true with two valid samples", () => {
    const r = validateCreateProductArgs(
      validArgs({
        has_samples: true,
        samples: [
          { size: "3ml", price: 5 },
          { size: "5ml", price: 8 },
        ],
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parsed.has_samples).toBe(true);
    expect(r.parsed.samples).toHaveLength(2);
    expect(r.parsed.samples[0]).toEqual({ size: "3ml", price: 5 });
    expect(r.parsed.samples[1]).toEqual({ size: "5ml", price: 8 });
  });

  it("auto-flips has_samples when samples array provided but flag is false", () => {
    const r = validateCreateProductArgs(
      validArgs({
        has_samples: false,
        samples: [{ size: "3ml", price: 5 }],
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parsed.has_samples).toBe(true);
    expect(r.parsed.samples).toHaveLength(1);
  });

  it("auto-flips when has_samples is undefined and samples provided", () => {
    const r = validateCreateProductArgs(
      validArgs({ samples: [{ size: "10ml", price: 12 }] })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parsed.has_samples).toBe(true);
  });

  it("treats has_samples=false with no samples as no samples", () => {
    const r = validateCreateProductArgs(validArgs({ has_samples: false }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parsed.has_samples).toBe(false);
    expect(r.parsed.samples).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// executeTool("create_product", ...) — integration with the validator
// ═════════════════════════════════════════════════════════════════════════
describe("executeTool create_product", () => {
  it("returns VALIDATION_ERROR text when only name is provided (does NOT call enrichProductData)", async () => {
    const result = await executeTool("create_product", { name: "X" }, "en");
    expect(result.text).toContain("VALIDATION_ERROR");
    expect(result.confirmation).toBeUndefined();
    expect(enrichProductData).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when has_samples=true with empty samples", async () => {
    const result = await executeTool(
      "create_product",
      validArgs({ has_samples: true, samples: [] }),
      "en"
    );
    expect(result.text).toContain("no samples");
    expect(result.confirmation).toBeUndefined();
  });

  it("returns confirmation with empty samples when valid args have no samples", async () => {
    const result = await executeTool("create_product", validArgs(), "en");
    expect(result.confirmation).toBeDefined();
    expect(result.confirmation?.type).toBe("create");
    if (result.confirmation?.type === "create") {
      expect(result.confirmation.payload.samples).toEqual([]);
      expect(result.confirmation.payload.has_samples).toBe(false);
    }
    expect(result.confirmation?.preview).not.toContain("🧪 Samples");
  });

  it("returns confirmation with populated samples when valid", async () => {
    const result = await executeTool(
      "create_product",
      validArgs({
        has_samples: true,
        samples: [
          { size: "3ml", price: 5 },
          { size: "5ml", price: 8 },
        ],
      }),
      "en"
    );
    expect(result.confirmation).toBeDefined();
    if (result.confirmation?.type === "create") {
      expect(result.confirmation.payload.samples).toHaveLength(2);
      expect(result.confirmation.payload.has_samples).toBe(true);
    }
    expect(result.confirmation?.preview).toContain("🧪 Samples");
    expect(result.confirmation?.preview).toContain("3ml — 5 LYD");
    expect(result.confirmation?.preview).toContain("5ml — 8 LYD");
  });

  it("calls enrichProductData when description and notes are missing AND validation passes", async () => {
    await executeTool("create_product", validArgs(), "en");
    expect(enrichProductData).toHaveBeenCalledTimes(1);
    expect(enrichProductData).toHaveBeenCalledWith("Sauvage", "");
  });

  it("does NOT call enrichProductData when description and notes are provided", async () => {
    await executeTool(
      "create_product",
      validArgs({
        description: "A fresh citrus woody fragrance.",
        fragrance_notes: {
          top: ["bergamot"],
          middle: ["sichuan pepper"],
          base: ["ambroxan"],
        },
      }),
      "en"
    );
    expect(enrichProductData).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════
// executeTool("get_order_by_id", ...)
// ═════════════════════════════════════════════════════════════════════════
describe("executeTool get_order_by_id", () => {
  const fakeOrder: Order = {
    id: "abc12345-aaaa-bbbb-cccc-ddddeeeeffff",
    first_name: "Jane",
    last_name: "Doe",
    phone: "+218911111111",
    city: "Tripoli",
    place_name: "Center",
    status: "pending",
    items: [
      {
        id: "p1",
        name: "Sauvage",
        price: 250,
        size: "100ml",
        quantity: 1,
        image: "",
      },
    ],
    total: 250,
    created_at: "2025-01-01T12:00:00Z",
  };

  it("returns formatted order text when found by full UUID", async () => {
    vi.mocked(getOrderById).mockResolvedValueOnce(fakeOrder);
    const result = await executeTool(
      "get_order_by_id",
      { id_or_short_id: "abc12345-aaaa-bbbb-cccc-ddddeeeeffff" },
      "en"
    );
    expect(getOrderById).toHaveBeenCalledWith(
      "abc12345-aaaa-bbbb-cccc-ddddeeeeffff"
    );
    expect(result.text).toContain("Order #abc12345");
    expect(result.text).toContain("Jane Doe");
  });

  it("returns formatted order text when found by 8-char short ID", async () => {
    vi.mocked(getOrderById).mockResolvedValueOnce(fakeOrder);
    const result = await executeTool(
      "get_order_by_id",
      { id_or_short_id: "abc12345" },
      "en"
    );
    expect(getOrderById).toHaveBeenCalledWith("abc12345");
    expect(result.text).toContain("Order #abc12345");
  });

  it("trims whitespace before passing to getOrderById", async () => {
    vi.mocked(getOrderById).mockResolvedValueOnce(fakeOrder);
    await executeTool(
      "get_order_by_id",
      { id_or_short_id: "  abc12345  " },
      "en"
    );
    expect(getOrderById).toHaveBeenCalledWith("abc12345");
  });

  it("returns 'Order not found' on ORDER_NOT_FOUND", async () => {
    vi.mocked(getOrderById).mockRejectedValueOnce(new Error(ORDER_NOT_FOUND));
    const result = await executeTool(
      "get_order_by_id",
      { id_or_short_id: "deadbeef" },
      "en"
    );
    expect(result.text).toContain("Order not found");
    expect(result.text).toContain("deadbeef");
  });

  it("returns 'Multiple orders match' on ORDER_AMBIGUOUS", async () => {
    vi.mocked(getOrderById).mockRejectedValueOnce(new Error(ORDER_AMBIGUOUS));
    const result = await executeTool(
      "get_order_by_id",
      { id_or_short_id: "abc123" },
      "en"
    );
    expect(result.text).toContain("Multiple orders match");
    expect(result.text).toContain("full UUID");
  });

  it("returns 'doesn't look like a valid order ID' on ORDER_INVALID_ID", async () => {
    vi.mocked(getOrderById).mockRejectedValueOnce(new Error(ORDER_INVALID_ID));
    const result = await executeTool(
      "get_order_by_id",
      { id_or_short_id: "xyzz" },
      "en"
    );
    expect(result.text).toContain("doesn't look like a valid order ID");
  });

  it("returns VALIDATION_ERROR when id_or_short_id is empty string", async () => {
    const result = await executeTool(
      "get_order_by_id",
      { id_or_short_id: "" },
      "en"
    );
    expect(result.text).toContain("VALIDATION_ERROR");
    expect(getOrderById).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when id_or_short_id is missing", async () => {
    const result = await executeTool("get_order_by_id", {}, "en");
    expect(result.text).toContain("VALIDATION_ERROR");
    expect(getOrderById).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════
// executeTool("get_orders", ...) — smoke test (regression coverage)
// ═════════════════════════════════════════════════════════════════════════
describe("executeTool get_orders", () => {
  it("returns 'No orders found.' when fetchOrders returns []", async () => {
    vi.mocked(fetchOrders).mockResolvedValueOnce([]);
    const result = await executeTool("get_orders", {}, "en");
    expect(result.text).toBe("No orders found.");
  });
});
