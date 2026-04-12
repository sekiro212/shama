/**
 * Real integration test for the agent loop.
 *
 * Runs the actual `runAgent` against the live OpenRouter API and live Supabase
 * (read-only paths only). Destructive flows — create/update/delete — are
 * exercised up to the confirmation step, which the agent loop already
 * short-circuits without touching the database.
 *
 * Requires `telegram-bot/.env` with:
 *   OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   GROQ_API_KEY, TELEGRAM_BOT_TOKEN, ADMIN_CHAT_IDS
 *
 * The script never actually talks to Telegram — it builds a fake Telegraf
 * Context that records replies/edits/deletes in memory.
 *
 * Run with:  npm run test:live
 */

import type { Context as TelegrafContext } from "telegraf";
import { runAgent } from "../agent/agent";
import type { BotSession, BotLanguage } from "../types";

// ─── Hard limits ────────────────────────────────────────────────────────────
const PER_CASE_TIMEOUT_MS = 20_000;
// Free-tier Gemini quota is 15 requests/minute. Multi-iter cases (tool call
// then text response) burn 2 requests each, so ~5s between cases keeps the
// whole run safely under the limit even on a cold cache.
const PER_CASE_DELAY_MS = 5_000;

// ─── Fake Telegraf context ──────────────────────────────────────────────────
interface RecordedReply {
  text: string;
  parse_mode?: string;
}

interface FakeContext {
  session: BotSession;
  chat: { id: number };
  replies: RecordedReply[];
  statusEdits: string[];
  reply: (text: string, opts?: { parse_mode?: string }) => Promise<{ message_id: number }>;
  sendChatAction: (action: string) => Promise<true>;
  telegram: {
    sendChatAction: (chatId: number, action: string) => Promise<true>;
    editMessageText: (
      chatId: number,
      messageId: number,
      _inline: undefined,
      text: string
    ) => Promise<true>;
    deleteMessage: (chatId: number, messageId: number) => Promise<true>;
  };
}

function makeFakeContext(lang: BotLanguage = "en"): FakeContext {
  const replies: RecordedReply[] = [];
  const statusEdits: string[] = [];
  let nextMessageId = 1;

  const ctx: FakeContext = {
    session: { history: [], confirmation: null, language: lang },
    chat: { id: 999 },
    replies,
    statusEdits,
    async reply(text, opts) {
      replies.push({ text, parse_mode: opts?.parse_mode });
      return { message_id: nextMessageId++ };
    },
    async sendChatAction() {
      return true;
    },
    telegram: {
      async sendChatAction() {
        return true;
      },
      async editMessageText(_chat, _msg, _inline, text) {
        statusEdits.push(text);
        return true;
      },
      async deleteMessage() {
        return true;
      },
    },
  };

  return ctx;
}

// ─── Tool-call tracking ─────────────────────────────────────────────────────
// Rather than monkey-patching `executeTool` (ESM live bindings forbid that),
// we read tool calls back out of session.history after the run finishes.
// `appendToolCall` records every call as a model message with a
// `functionCall` part, so the history is already a complete trace.

interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
}

function extractToolCallsAfter(
  ctx: FakeContext,
  startIndex: number
): ToolCallRecord[] {
  const out: ToolCallRecord[] = [];
  const slice = ctx.session.history.slice(startIndex);
  for (const msg of slice) {
    // OpenAI-compatible ChatMessage format — tool calls live in msg.tool_calls
    const tcs = msg.tool_calls ?? [];
    for (const tc of tcs) {
      if (tc.function?.name) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments); } catch { /* empty */ }
        out.push({ name: tc.function.name, args });
      }
    }
  }
  return out;
}

// ─── Single-case runner ─────────────────────────────────────────────────────
interface CaseResult {
  name: string;
  pass: boolean;
  durationMs: number;
  reason?: string;
  details?: string;
}

interface ScenarioInput {
  name: string;
  lang?: BotLanguage;
  // Optional pre-populated history (for multi-turn cases).
  prelude?: Array<{ role: "user" | "model"; text: string }>;
  prompt: string;
  // Assertion: returns null on pass, an error message string on fail.
  // Receives the recorded tool calls SINCE the case started, the fake
  // context (replies, statusEdits), and the wall-clock duration.
  check: (state: {
    toolCalls: ToolCallRecord[];
    ctx: FakeContext;
    durationMs: number;
  }) => string | null;
}

async function runOne(scenario: ScenarioInput): Promise<CaseResult> {
  const lang = scenario.lang ?? "en";
  const ctx = makeFakeContext(lang);

  // Hydrate prelude history if present (multi-turn cases).
  if (scenario.prelude) {
    for (const turn of scenario.prelude) {
      ctx.session.history.push({ role: turn.role as "user" | "assistant", content: turn.text });
    }
  }

  const historyStartIndex = ctx.session.history.length;
  const start = Date.now();
  let runError: string | undefined;

  try {
    await Promise.race([
      runAgent(
        ctx as unknown as TelegrafContext & { session: BotSession },
        scenario.prompt,
        lang
      ),
      new Promise<void>((_, reject) =>
        setTimeout(
          () => reject(new Error(`exceeded ${PER_CASE_TIMEOUT_MS}ms`)),
          PER_CASE_TIMEOUT_MS
        )
      ),
    ]);
  } catch (err) {
    runError = err instanceof Error ? err.message : String(err);
  }

  const durationMs = Date.now() - start;
  const toolCalls = extractToolCallsAfter(ctx, historyStartIndex);

  if (runError) {
    return {
      name: scenario.name,
      pass: false,
      durationMs,
      reason: `runAgent threw: ${runError}`,
      details: summarize(ctx, toolCalls),
    };
  }

  const checkErr = scenario.check({ toolCalls, ctx, durationMs });
  if (checkErr) {
    return {
      name: scenario.name,
      pass: false,
      durationMs,
      reason: checkErr,
      details: summarize(ctx, toolCalls),
    };
  }

  if (durationMs > PER_CASE_TIMEOUT_MS) {
    return {
      name: scenario.name,
      pass: false,
      durationMs,
      reason: `case took ${durationMs}ms (limit ${PER_CASE_TIMEOUT_MS}ms)`,
      details: summarize(ctx, toolCalls),
    };
  }

  return {
    name: scenario.name,
    pass: true,
    durationMs,
    details: summarize(ctx, toolCalls),
  };
}

function summarize(ctx: FakeContext, toolCalls: ToolCallRecord[]): string {
  const lines: string[] = [];
  for (const c of toolCalls) {
    lines.push(`  tool: ${c.name}(${JSON.stringify(c.args).slice(0, 200)})`);
  }
  for (const r of ctx.replies) {
    lines.push(`  reply: ${r.text.slice(0, 200)}${r.text.length > 200 ? "…" : ""}`);
  }
  return lines.join("\n");
}

// ─── Scenarios ──────────────────────────────────────────────────────────────
const scenarios: ScenarioInput[] = [
  {
    name: "1. connectivity / cheap call",
    prompt: "say hi in one short sentence",
    check: ({ ctx, toolCalls }) => {
      if (toolCalls.length > 0)
        return `expected no tool call, got: ${toolCalls.map((c) => c.name).join(",")}`;
      const text = ctx.replies.map((r) => r.text).join(" ").trim();
      if (!text) return "no reply text";
      return null;
    },
  },
  {
    name: "2. product count",
    prompt: "how many products do I have?",
    check: ({ toolCalls, ctx }) => {
      const tool = toolCalls.find(
        (c) =>
          c.name === "search_products" ||
          c.name === "get_analytics" ||
          c.name === "get_product_info"
      );
      if (!tool) return `expected a search/analytics tool call, got: ${toolCalls.map((c) => c.name).join(",")}`;
      const text = ctx.replies.map((r) => r.text).join(" ");
      if (!/\d/.test(text)) return `reply has no number: "${text.slice(0, 120)}"`;
      return null;
    },
  },
  {
    name: "3. search men perfumes",
    prompt: "show me some men perfumes",
    check: ({ toolCalls }) => {
      const tool = toolCalls.find((c) => c.name === "search_products");
      if (!tool) return `expected search_products, got: ${toolCalls.map((c) => c.name).join(",")}`;
      return null;
    },
  },
  {
    name: "4. create — missing fields",
    prompt: "create Sauvage",
    check: ({ toolCalls, ctx }) => {
      const created = toolCalls.find((c) => c.name === "create_product");
      if (created)
        return `expected NO create_product call, got args: ${JSON.stringify(created.args)}`;
      const text = ctx.replies.map((r) => r.text).join(" ").toLowerCase();
      // Should ask for the missing fields.
      const asksForFields =
        text.includes("price") ||
        text.includes("size") ||
        text.includes("gender") ||
        text.includes("stock");
      if (!asksForFields) return `reply doesn't ask for missing fields: "${text.slice(0, 200)}"`;
      return null;
    },
  },
  {
    name: "5. create — full fields, no samples question yet",
    prompt: "create Dior Sauvage, price 250, 100ml, men, stock 20",
    check: ({ toolCalls, ctx }) => {
      // Either model asks about samples (no create_product call yet) OR it
      // calls create_product with has_samples=false. Both are acceptable
      // model behaviours; we just verify it didn't invent sample data.
      const created = toolCalls.find((c) => c.name === "create_product");
      if (created) {
        const args = created.args as Record<string, unknown>;
        if (args.has_samples === true) {
          return `model invented has_samples=true without admin saying so: ${JSON.stringify(args)}`;
        }
        return null;
      }
      const text = ctx.replies.map((r) => r.text).join(" ").toLowerCase();
      if (!text.includes("sample"))
        return `expected a samples question, got: "${text.slice(0, 200)}"`;
      return null;
    },
  },
  {
    name: "6. create — with samples (multi-turn)",
    prelude: [
      { role: "user", text: "create Dior Sauvage" },
      {
        role: "model",
        text: "I need the price, size, gender, and stock quantity for Sauvage.",
      },
      { role: "user", text: "price 250, size 100ml, men, stock 20" },
      {
        role: "model",
        text:
          "Does this perfume have samples? If yes, what sizes and prices? (e.g., 3ml at 5 LYD, 5ml at 8 LYD)",
      },
    ],
    prompt: "yes 3ml at 8 LYD and 5ml at 12 LYD",
    check: ({ toolCalls, ctx }) => {
      const created = toolCalls.find((c) => c.name === "create_product");
      if (!created) return `expected create_product call, got: ${toolCalls.map((c) => c.name).join(",")}`;
      const args = created.args as Record<string, unknown>;
      if (args.has_samples !== true) return `expected has_samples=true, got: ${JSON.stringify(args.has_samples)}`;
      const samples = args.samples as Array<{ size: string; price: number }> | undefined;
      if (!Array.isArray(samples) || samples.length < 2)
        return `expected ≥2 samples, got: ${JSON.stringify(samples)}`;
      // Confirmation should be queued (no DB write happened — that's
      // what the confirm button is for).
      if (!ctx.session.confirmation || ctx.session.confirmation.type !== "create")
        return `expected pending create confirmation, got: ${JSON.stringify(ctx.session.confirmation)}`;
      return null;
    },
  },
  {
    name: "7. order lookup by short id",
    prompt: "check order abc12345",
    check: ({ toolCalls }) => {
      const tool = toolCalls.find((c) => c.name === "get_order_by_id");
      if (!tool) return `expected get_order_by_id, got: ${toolCalls.map((c) => c.name).join(",")}`;
      const arg = (tool.args as Record<string, unknown>).id_or_short_id;
      if (typeof arg !== "string" || !arg.toLowerCase().includes("abc12345"))
        return `expected id_or_short_id=abc12345, got: ${JSON.stringify(arg)}`;
      return null;
    },
  },
  {
    name: "8. orders list — today",
    prompt: "show today's orders",
    check: ({ toolCalls }) => {
      const tool = toolCalls.find((c) => c.name === "get_orders");
      if (!tool) return `expected get_orders, got: ${toolCalls.map((c) => c.name).join(",")}`;
      return null;
    },
  },
  {
    name: "9. arabic — product count",
    lang: "ar",
    prompt: "كم عدد المنتجات لدي؟",
    check: ({ toolCalls, ctx }) => {
      if (toolCalls.length === 0)
        return `expected at least one tool call, got none`;
      const text = ctx.replies.map((r) => r.text).join(" ");
      if (!text.trim()) return `no reply text`;
      // Heuristic: at least one Arabic char in the reply.
      if (!/[\u0600-\u06FF]/.test(text))
        return `reply not in Arabic: "${text.slice(0, 160)}"`;
      return null;
    },
  },
  {
    name: "10. analytics",
    prompt: "show me store analytics",
    check: ({ toolCalls }) => {
      const tool = toolCalls.find(
        (c) => c.name === "get_analytics" || c.name === "get_orders"
      );
      if (!tool) return `expected analytics or orders tool, got: ${toolCalls.map((c) => c.name).join(",")}`;
      return null;
    },
  },
  {
    name: "11. timing budget — sanity check",
    prompt: "say one word",
    check: ({ ctx, durationMs }) => {
      const text = ctx.replies.map((r) => r.text).join(" ").trim();
      if (!text) return `no reply`;
      if (durationMs > 10_000)
        return `simple call took ${durationMs}ms (>10s) — Gemini likely still thinking`;
      return null;
    },
  },
];

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("─ Real-Gemini agent test ─");
  console.log(`Per-case limit: ${PER_CASE_TIMEOUT_MS}ms\n`);

  let passed = 0;
  let failed = 0;
  const failures: CaseResult[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    process.stdout.write(`▶ ${sc.name} … `);
    const r = await runOne(sc);
    if (r.pass) {
      passed++;
      console.log(`PASS (${r.durationMs}ms)`);
    } else {
      failed++;
      failures.push(r);
      console.log(`FAIL (${r.durationMs}ms)`);
      console.log(`   ✗ ${r.reason}`);
      if (r.details) console.log(r.details);
    }
    if (i < scenarios.length - 1) {
      await new Promise((res) => setTimeout(res, PER_CASE_DELAY_MS));
    }
  }

  console.log(`\n─ Summary ─`);
  console.log(`Passed: ${passed}/${scenarios.length}`);
  console.log(`Failed: ${failed}/${scenarios.length}`);

  if (failed > 0) {
    console.log(`\n─ Failures ─`);
    for (const f of failures) {
      console.log(`✗ ${f.name} (${f.durationMs}ms)`);
      console.log(`   ${f.reason}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error in test runner:", err);
  process.exit(1);
});
