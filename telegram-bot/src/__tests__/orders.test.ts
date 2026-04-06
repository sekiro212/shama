import { describe, it, expect, vi, beforeEach } from "vitest";

// `../config` is mocked globally in src/__tests__/_setup.ts.

// Programmable supabase mock — each test sets the data the next call returns.
const mockState: {
  data: unknown;
  error: { message: string } | null;
  capturedTable?: string;
  capturedEqArgs?: [string, unknown];
} = {
  data: null,
  error: null,
};

vi.mock("../services/supabase", () => {
  // Build a chainable query builder where every method returns `this`. The
  // terminal methods (`maybeSingle`, `single`, `limit`) all resolve with
  // `mockState`. This is enough fidelity for the orders.ts query patterns.
  function makeChain() {
    const chain: Record<string, (...args: unknown[]) => unknown> = {};
    const passthrough = (..._args: unknown[]) => chain;
    chain.select = passthrough;
    chain.eq = (col: string, val: unknown) => {
      mockState.capturedEqArgs = [col, val];
      return chain;
    };
    chain.order = passthrough;
    chain.limit = () => Promise.resolve({ data: mockState.data, error: mockState.error });
    chain.maybeSingle = () =>
      Promise.resolve({ data: mockState.data, error: mockState.error });
    chain.single = () =>
      Promise.resolve({ data: mockState.data, error: mockState.error });
    chain.gte = passthrough;
    chain.or = passthrough;
    return chain;
  }

  return {
    supabase: {
      from: vi.fn((table: string) => {
        mockState.capturedTable = table;
        return makeChain();
      }),
    },
  };
});

import {
  formatOrder,
  getOrderById,
  FULL_UUID_RE,
  SHORT_ID_RE,
  ORDER_NOT_FOUND,
  ORDER_AMBIGUOUS,
  ORDER_INVALID_ID,
  type Order,
} from "../services/orders";

beforeEach(() => {
  mockState.data = null;
  mockState.error = null;
  mockState.capturedTable = undefined;
  mockState.capturedEqArgs = undefined;
});

// ═════════════════════════════════════════════════════════════════════════
// formatOrder
// ═════════════════════════════════════════════════════════════════════════
const baseOrder: Order = {
  id: "abcdef12-aaaa-bbbb-cccc-dddd11111111",
  first_name: "Jane",
  last_name: "Doe",
  phone: "+218911223344",
  city: "Tripoli",
  place_name: "Center",
  status: "pending",
  items: [
    { id: "p1", name: "Sauvage", price: 250, size: "100ml", quantity: 1, image: "" },
    { id: "p2", name: "Bleu", price: 180, size: "50ml", quantity: 2, image: "" },
  ],
  total: 610,
  created_at: "2025-01-01T12:00:00Z",
};

describe("formatOrder", () => {
  it("renders English with the 8-char short ID", () => {
    const text = formatOrder(baseOrder, "en");
    expect(text).toContain("<b>Order #abcdef12</b>");
    expect(text).toContain("Customer: Jane Doe");
    expect(text).toContain("Phone: +218911223344");
    expect(text).toContain("City: Tripoli - Center");
    expect(text).toContain("Status: pending");
    expect(text).toContain("Sauvage");
    expect(text).toContain("Bleu");
    expect(text).toContain("Total: 610");
  });

  it("renders Arabic with Arabic labels (no English label leakage)", () => {
    const text = formatOrder(baseOrder, "ar");
    expect(text).toContain("طلب");
    expect(text).toContain("العميل");
    expect(text).toContain("الهاتف");
    expect(text).toContain("المدينة");
    expect(text).toContain("الإجمالي");
    // Make sure English labels did NOT leak through
    expect(text).not.toContain("Customer:");
    expect(text).not.toContain("Phone:");
    expect(text).not.toContain("Total:");
  });

  it("handles null place_name without trailing dash", () => {
    const text = formatOrder({ ...baseOrder, place_name: null }, "en");
    expect(text).toContain("City: Tripoli");
    expect(text).not.toContain("Tripoli -");
  });

  it("handles empty items array without crashing", () => {
    const text = formatOrder({ ...baseOrder, items: [] }, "en");
    expect(text).toContain("Order #abcdef12");
    expect(text).toContain("Total: 610");
  });

  it("handles items=null (DB JSONB can be null)", () => {
    const text = formatOrder(
      { ...baseOrder, items: null as unknown as Order["items"] },
      "en"
    );
    // Should not throw and should still render the order shell
    expect(text).toContain("Order #abcdef12");
  });

  it("DOCUMENTS GAP: item.name with HTML chars is currently NOT escaped", () => {
    // We render with parse_mode: "HTML" — unescaped <script> is a latent bug.
    // Test pinned to current behavior; flagged to user as out-of-scope follow-up.
    const text = formatOrder(
      {
        ...baseOrder,
        items: [
          {
            id: "p1",
            name: "<script>alert(1)</script>",
            price: 1,
            size: "1ml",
            quantity: 1,
            image: "",
          },
        ],
      },
      "en"
    );
    expect(text).toContain("<script>");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// FULL_UUID_RE / SHORT_ID_RE — pure regex sanity
// ═════════════════════════════════════════════════════════════════════════
describe("FULL_UUID_RE", () => {
  it("matches a canonical lowercase UUID", () => {
    expect(FULL_UUID_RE.test("abcdef12-aaaa-bbbb-cccc-dddd11111111")).toBe(true);
  });

  it("matches an uppercase UUID (case-insensitive)", () => {
    expect(FULL_UUID_RE.test("ABCDEF12-AAAA-BBBB-CCCC-DDDD11111111")).toBe(true);
  });

  it("rejects a 35-char string (too short)", () => {
    expect(FULL_UUID_RE.test("abcdef12-aaaa-bbbb-cccc-dddd1111111")).toBe(false);
  });

  it("rejects a 37-char string (too long)", () => {
    expect(FULL_UUID_RE.test("abcdef12-aaaa-bbbb-cccc-dddd111111111")).toBe(false);
  });

  it("rejects a UUID with non-hex character 'g'", () => {
    expect(FULL_UUID_RE.test("abcdefg2-aaaa-bbbb-cccc-dddd11111111")).toBe(false);
  });
});

describe("SHORT_ID_RE", () => {
  it("matches an 8-char hex prefix", () => {
    expect(SHORT_ID_RE.test("abcdef12")).toBe(true);
  });

  it("matches a 6-char and 12-char hex prefix", () => {
    expect(SHORT_ID_RE.test("abcdef")).toBe(true);
    expect(SHORT_ID_RE.test("abcdef123456")).toBe(true);
  });

  it("rejects a 5-char prefix (too short)", () => {
    expect(SHORT_ID_RE.test("abcde")).toBe(false);
  });

  it("rejects a string containing a dash", () => {
    expect(SHORT_ID_RE.test("abc-1234")).toBe(false);
  });

  it("matches uppercase hex (case-insensitive)", () => {
    expect(SHORT_ID_RE.test("ABCDEF12")).toBe(true);
  });

  it("rejects xyz (non-hex letters)", () => {
    expect(SHORT_ID_RE.test("xyzz")).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// getOrderById
// ═════════════════════════════════════════════════════════════════════════
describe("getOrderById", () => {
  it("fetches via .eq('id', uuid) when given a full UUID", async () => {
    mockState.data = baseOrder;
    const result = await getOrderById("abcdef12-aaaa-bbbb-cccc-dddd11111111");
    expect(result.id).toBe(baseOrder.id);
    expect(mockState.capturedTable).toBe("orders");
    expect(mockState.capturedEqArgs).toEqual([
      "id",
      "abcdef12-aaaa-bbbb-cccc-dddd11111111",
    ]);
  });

  it("throws ORDER_NOT_FOUND when full UUID returns null", async () => {
    mockState.data = null;
    await expect(
      getOrderById("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
    ).rejects.toThrow(ORDER_NOT_FOUND);
  });

  it("returns the single match when short prefix matches exactly one row", async () => {
    mockState.data = [
      { ...baseOrder, id: "11111111-aaaa-bbbb-cccc-dddd11111111" },
      { ...baseOrder, id: "abcdef12-aaaa-bbbb-cccc-dddd11111111" },
      { ...baseOrder, id: "22222222-aaaa-bbbb-cccc-dddd11111111" },
    ];
    const result = await getOrderById("abcdef12");
    expect(result.id).toBe("abcdef12-aaaa-bbbb-cccc-dddd11111111");
  });

  it("matches case-insensitively for short prefix", async () => {
    mockState.data = [
      { ...baseOrder, id: "abcdef12-aaaa-bbbb-cccc-dddd11111111" },
    ];
    const result = await getOrderById("ABCDEF12");
    expect(result.id).toBe("abcdef12-aaaa-bbbb-cccc-dddd11111111");
  });

  it("throws ORDER_NOT_FOUND when short prefix matches zero rows", async () => {
    mockState.data = [
      { ...baseOrder, id: "11111111-aaaa-bbbb-cccc-dddd11111111" },
    ];
    await expect(getOrderById("99999999")).rejects.toThrow(ORDER_NOT_FOUND);
  });

  it("throws ORDER_AMBIGUOUS when short prefix matches >=2 rows", async () => {
    mockState.data = [
      { ...baseOrder, id: "abcdef12-aaaa-bbbb-cccc-dddd11111111" },
      { ...baseOrder, id: "abcdef12-eeee-ffff-0000-111122223333" },
    ];
    await expect(getOrderById("abcdef12")).rejects.toThrow(ORDER_AMBIGUOUS);
  });

  it("throws ORDER_INVALID_ID for garbage like 'xyz'", async () => {
    await expect(getOrderById("xyz")).rejects.toThrow(ORDER_INVALID_ID);
  });

  it("throws ORDER_INVALID_ID for empty string", async () => {
    await expect(getOrderById("")).rejects.toThrow(ORDER_INVALID_ID);
  });

  it("throws ORDER_INVALID_ID for string with dash that isn't a full UUID", async () => {
    await expect(getOrderById("abc-1234")).rejects.toThrow(ORDER_INVALID_ID);
  });

  it("trims whitespace before matching", async () => {
    mockState.data = baseOrder;
    const result = await getOrderById(
      "  abcdef12-aaaa-bbbb-cccc-dddd11111111  "
    );
    expect(result.id).toBe(baseOrder.id);
  });
});
