import { describe, it, expect, vi, beforeEach } from "vitest";

// `../config` is mocked globally in src/__tests__/_setup.ts.

// ─── Mock fetch for OpenRouter ──────────────────────────────────────
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

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

/** Helper to create a mock Response with OpenRouter format */
function mockOpenRouterResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe("runAgent onStatus callback", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.mocked(executeTool).mockClear();
    vi.mocked(executeTool).mockImplementation(async () => ({ text: "ok" }));
  });

  it("calls onStatus in order: thinking, tool:<name>, thinking", async () => {
    // Call 1 → tool call response. Call 2 → text response.
    fetchMock
      .mockResolvedValueOnce(
        mockOpenRouterResponse({
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call_1",
                    type: "function",
                    function: {
                      name: "search_products",
                      arguments: '{"query":"men"}',
                    },
                  },
                ],
              },
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockOpenRouterResponse({
          choices: [
            {
              message: {
                role: "assistant",
                content: "done",
              },
            },
          ],
        })
      );

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
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(executeTool).toHaveBeenCalledWith(
      "search_products",
      { query: "men" },
      "en"
    );
  });

  it("works when onStatus is undefined (back-compat)", async () => {
    fetchMock.mockResolvedValueOnce(
      mockOpenRouterResponse({
        choices: [
          {
            message: { role: "assistant", content: "hi" },
          },
        ],
      })
    );

    const ctx = makeCtx();
    await expect(runAgent(ctx, "hi", "en")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
