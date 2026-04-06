import { describe, it, expect, vi, beforeEach } from "vitest";

// `../config` is mocked globally in src/__tests__/_setup.ts.

// vi.mock factories run before module imports, so any value the factory
// references must be hoisted alongside it.
const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

// ─── Canned Gemini responses ─────────────────────────────────────
// First call → model returns a function call to search_products.
// Second call → model returns a plain-text final answer.
// runAgent should call onStatus("thinking") before each generateContent
// and onStatus("tool", "search_products") right before executeTool runs.
vi.mock("@google/genai", () => {
  class GoogleGenAI {
    models = { generateContent: generateContentMock };
    constructor(_: unknown) {}
  }
  // The Type enum is consumed by ../agent/tools.ts at module-load. We don't
  // care about its values for this test, just need the keys to exist.
  const Type = new Proxy(
    {},
    { get: (_t, p) => (typeof p === "string" ? p : "") }
  );
  return { GoogleGenAI, Type };
});

vi.mock("../agent/toolExecutor", () => ({
  executeTool: vi.fn(async () => ({ text: "ok" })),
}));

// ─── Imports under test (after mocks) ─────────────────────────────
import { runAgent } from "../agent/agent";
import { executeTool } from "../agent/toolExecutor";
import type { BotSession } from "../types";

function makeCtx() {
  const session: BotSession = {
    history: [],
    confirmation: null,
    language: "en",
  };
  const reply = vi.fn(async () => ({ message_id: 1 }));
  return {
    session,
    reply,
    chat: { id: 1 },
  } as unknown as Parameters<typeof runAgent>[0];
}

describe("runAgent onStatus callback", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    vi.mocked(executeTool).mockClear();
    vi.mocked(executeTool).mockImplementation(async () => ({ text: "ok" }));
  });

  it("calls onStatus in order: thinking, tool:<name>, thinking", async () => {
    // Iter 0 → function call. Iter 1 → text response.
    generateContentMock
      .mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: "search_products",
                    args: { query: "men" },
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        candidates: [
          {
            content: { parts: [{ text: "done" }] },
          },
        ],
      });

    const calls: Array<["thinking"] | ["tool", string]> = [];
    const onStatus = async (
      kind: "thinking" | "tool",
      toolName?: string
    ) => {
      calls.push(kind === "thinking" ? ["thinking"] : ["tool", toolName ?? ""]);
    };

    const ctx = makeCtx();
    await runAgent(ctx, "show men perfumes", "en", onStatus);

    expect(calls).toEqual([
      ["thinking"],
      ["tool", "search_products"],
      ["thinking"],
    ]);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(executeTool).toHaveBeenCalledWith(
      "search_products",
      { query: "men" },
      "en"
    );
  });

  it("works when onStatus is undefined (back-compat)", async () => {
    generateContentMock.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: "hi" }] } }],
    });

    const ctx = makeCtx();
    await expect(runAgent(ctx, "hi", "en")).resolves.toBeUndefined();
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });
});
