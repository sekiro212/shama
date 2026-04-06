import { describe, it, expect, vi, beforeEach } from "vitest";

// `../config` is mocked globally in src/__tests__/_setup.ts.

// Track inserts per table so we can assert which inserts happened.
type InsertCall = { table: string; rows: unknown };
const insertCalls: InsertCall[] = [];

vi.mock("../services/supabase", () => {
  function makeChain(table: string) {
    const chain: Record<string, (...args: unknown[]) => unknown> = {};
    chain.insert = (rows: unknown) => {
      insertCalls.push({ table, rows });
      // perfumes.insert(...).select("id").single() returns the new id
      const fakeId = "deadbeef-aaaa-bbbb-cccc-111122223333";
      const after: Record<string, (...args: unknown[]) => unknown> = {};
      after.select = () => after;
      after.single = () => Promise.resolve({ data: { id: fakeId }, error: null });
      // perfume_samples.insert(...) is awaited directly without .select()
      // — return a thenable that resolves with { error: null }
      const thenable = {
        ...after,
        then: (resolve: (v: { data: null; error: null }) => void) =>
          resolve({ data: null, error: null }),
      };
      return thenable;
    };
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.single = () => Promise.resolve({ data: null, error: null });
    chain.maybeSingle = () => Promise.resolve({ data: null, error: null });
    chain.or = () => chain;
    chain.order = () => chain;
    chain.limit = () => Promise.resolve({ data: [], error: null });
    chain.update = () => chain;
    chain.delete = () => chain;
    return chain;
  }

  return {
    supabase: {
      from: vi.fn((table: string) => makeChain(table)),
    },
  };
});

import { createProduct } from "../services/products";
import { CreateProductSchema, SAMPLE_SIZES } from "../types";
import type { ProductDraft } from "../types";

beforeEach(() => {
  insertCalls.length = 0;
});

function draft(extra: Partial<ProductDraft> = {}): ProductDraft {
  return {
    name: "Sauvage",
    name_ar: "سوفاج",
    brand: "Dior",
    description: "Fresh woody",
    description_ar: "خشبي منعش",
    fragrance_notes: { top: ["bergamot"], middle: ["pepper"], base: ["amber"] },
    fragrance_notes_ar: { top: ["برغموت"], middle: ["فلفل"], base: ["عنبر"] },
    price: 250,
    size: "100ml",
    gender: "men",
    stock_quantity: 20,
    has_samples: false,
    samples: [],
    ...extra,
  };
}

// ═════════════════════════════════════════════════════════════════════════
// createProduct — samples insert path
// ═════════════════════════════════════════════════════════════════════════
describe("createProduct samples insert path", () => {
  it("inserts perfume_samples rows when has_samples=true with two valid samples", async () => {
    await createProduct(
      draft({
        has_samples: true,
        samples: [
          { size: "3ml", price: 5 },
          { size: "5ml", price: 8 },
        ],
      })
    );

    const sampleInsert = insertCalls.find((c) => c.table === "perfume_samples");
    expect(sampleInsert).toBeDefined();
    const rows = sampleInsert!.rows as Array<{
      perfume_id: string;
      size: string;
      price: number;
      stock_quantity: number;
      is_active: boolean;
    }>;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      perfume_id: "deadbeef-aaaa-bbbb-cccc-111122223333",
      size: "3ml",
      price: 5,
      stock_quantity: 10,
      is_active: true,
    });
    expect(rows[1]).toEqual({
      perfume_id: "deadbeef-aaaa-bbbb-cccc-111122223333",
      size: "5ml",
      price: 8,
      stock_quantity: 10,
      is_active: true,
    });
  });

  it("does NOT insert perfume_samples when has_samples=false", async () => {
    await createProduct(draft({ has_samples: false }));
    const sampleInsert = insertCalls.find((c) => c.table === "perfume_samples");
    expect(sampleInsert).toBeUndefined();
  });

  it("does NOT insert perfume_samples when has_samples=true but samples=[]", async () => {
    // createProduct guards the samples insert with `samples.length > 0`, and
    // Zod's default for samples is [], so this state is real and benign.
    await createProduct(draft({ has_samples: true, samples: [] }));
    const sampleInsert = insertCalls.find((c) => c.table === "perfume_samples");
    expect(sampleInsert).toBeUndefined();
  });

  it("inserts the perfume row in the perfumes table", async () => {
    await createProduct(draft());
    const perfumeInsert = insertCalls.find((c) => c.table === "perfumes");
    expect(perfumeInsert).toBeDefined();
    const row = perfumeInsert!.rows as { name: string; price: number; size: string };
    expect(row.name).toBe("Sauvage");
    expect(row.price).toBe(250);
    expect(row.size).toBe("100ml");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// CreateProductSchema — Zod sample-size enum
// ═════════════════════════════════════════════════════════════════════════
describe("CreateProductSchema samples enum", () => {
  it("accepts a valid sample size from the enum", () => {
    const r = CreateProductSchema.safeParse({
      name: "X",
      price: 1,
      size: "100ml",
      gender: "men",
      stock_quantity: 1,
      has_samples: true,
      samples: [{ size: "3ml", price: 5 }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects '7ml' (not in DB enum)", () => {
    const r = CreateProductSchema.safeParse({
      name: "X",
      price: 1,
      size: "100ml",
      gender: "men",
      stock_quantity: 1,
      has_samples: true,
      samples: [{ size: "7ml", price: 5 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects '50ml' (a valid bottle size, not a sample size)", () => {
    const r = CreateProductSchema.safeParse({
      name: "X",
      price: 1,
      size: "100ml",
      gender: "men",
      stock_quantity: 1,
      has_samples: true,
      samples: [{ size: "50ml", price: 5 }],
    });
    expect(r.success).toBe(false);
  });

  it("accepts each of the 7 allowed enum values", () => {
    for (const s of SAMPLE_SIZES) {
      const r = CreateProductSchema.safeParse({
        name: "X",
        price: 1,
        size: "100ml",
        gender: "men",
        stock_quantity: 1,
        has_samples: true,
        samples: [{ size: s, price: 5 }],
      });
      expect(r.success).toBe(true);
    }
  });
});
