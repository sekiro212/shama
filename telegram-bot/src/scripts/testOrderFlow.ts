/**
 * End-to-end test for the order tools (get_orders, get_order_by_id,
 * get_analytics).
 *
 * Strategy:
 *   1. Insert a synthetic "BOT-TEST" marker order directly via Supabase.
 *   2. Drive the real agent loop with prompts that should hit each order
 *      tool, and verify the bot's reply actually contains the test order's
 *      data — not just that the tool was called.
 *   3. Delete the test order at the end (and on failure, via finally).
 *
 * Run with:  npm run test:orders
 */

import type { Context as TelegrafContext } from "telegraf";
import { runAgent } from "../agent/agent";
import { supabase } from "../services/supabase";
import type { BotSession, BotLanguage } from "../types";

// ─── Fake Telegraf context (same shape as testCrudFlow) ────────────────────
interface RecordedReply {
  text: string;
}

interface FakeContext {
  session: BotSession;
  chat: { id: number };
  replies: RecordedReply[];
  reply: (text: string, opts?: unknown) => Promise<{ message_id: number }>;
  sendChatAction: (action: string) => Promise<true>;
  telegram: {
    sendChatAction: (chatId: number, action: string) => Promise<true>;
    editMessageText: () => Promise<true>;
    deleteMessage: () => Promise<true>;
  };
}

function makeCtx(lang: BotLanguage = "en"): FakeContext {
  const replies: RecordedReply[] = [];
  let nextId = 1;
  return {
    session: { history: [], confirmation: null, language: lang },
    chat: { id: 4321 },
    replies,
    async reply(text) {
      replies.push({ text });
      return { message_id: nextId++ };
    },
    async sendChatAction() {
      return true;
    },
    telegram: {
      async sendChatAction() {
        return true;
      },
      async editMessageText() {
        return true;
      },
      async deleteMessage() {
        return true;
      },
    },
  };
}

function lastReply(ctx: FakeContext): string {
  return ctx.replies.length > 0
    ? ctx.replies[ctx.replies.length - 1].text
    : "(no reply)";
}

function repliesAfter(ctx: FakeContext, idx: number): string {
  return ctx.replies
    .slice(idx)
    .map((r) => r.text)
    .join("\n---\n");
}

async function turn(
  ctx: FakeContext,
  text: string,
  lang: BotLanguage = "en"
): Promise<string> {
  const before = ctx.replies.length;
  // Reset history per turn so the model doesn't carry over context that
  // might confuse a new tool selection.
  ctx.session.history = [];
  await runAgent(
    ctx as unknown as TelegrafContext & { session: BotSession },
    text,
    lang
  );
  return repliesAfter(ctx, before);
}

function check(label: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  ✗ ${label}`);
    if (detail) console.log(`    ${detail.slice(0, 400)}`);
    process.exitCode = 1;
    throw new Error(`Assertion failed: ${label}`);
  }
}

// ─── Synthetic order ────────────────────────────────────────────────────────
const MARKER_FIRST_NAME = "BotTest";
const MARKER_LAST_NAME = "QA";

interface TestOrder {
  id: string;
  shortId: string;
}

async function insertTestOrder(): Promise<TestOrder> {
  const items = [
    {
      id: "test-item-1",
      name: "Test Perfume",
      price: 150,
      size: "100ml",
      quantity: 1,
      image: "",
    },
  ];
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      first_name: MARKER_FIRST_NAME,
      last_name: MARKER_LAST_NAME,
      email: "bot-test@example.com",
      phone: "+218900000000",
      city: "Tripoli",
      place_name: "Test Place",
      total: 150,
      subtotal: 150,
      items,
      status: "pending",
      order_date: now,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert test order: ${error?.message ?? "no data"}`);
  }
  return { id: data.id as string, shortId: (data.id as string).slice(0, 8) };
}

async function deleteTestOrder(id: string) {
  await supabase.from("orders").delete().eq("id", id);
}

async function cleanupLeftovers() {
  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("first_name", MARKER_FIRST_NAME)
    .eq("last_name", MARKER_LAST_NAME);
  for (const row of (data ?? []) as Array<{ id: string }>) {
    await supabase.from("orders").delete().eq("id", row.id);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("─ E2E orders-flow test ─\n");

  console.log("0. Pre-clean any leftover test orders");
  await cleanupLeftovers();
  console.log("  ✓ clean slate\n");

  console.log("1. Insert synthetic test order");
  const test = await insertTestOrder();
  console.log(`   id=${test.id}`);
  console.log(`   short=${test.shortId}\n`);

  try {
    const ctx = makeCtx("en");

    // ── 2. Today's orders (get_orders) ──
    console.log('2. Turn → "show me today\'s orders"');
    const r1 = await turn(ctx, "show me today's orders");
    console.log(`   bot: ${lastReply(ctx).slice(0, 250)}`);
    check(
      "reply mentions our test customer name",
      r1.includes(MARKER_FIRST_NAME),
      r1
    );
    check(
      "reply contains an order short id (8-char hex)",
      /#[0-9a-f]{8}/i.test(r1),
      r1
    );

    // ── 3. Pending-only filter ──
    console.log('\n3. Turn → "show me pending orders"');
    const r2 = await turn(ctx, "show me pending orders");
    console.log(`   bot: ${lastReply(ctx).slice(0, 250)}`);
    check(
      "pending-filter reply still includes our test order",
      r2.includes(MARKER_FIRST_NAME),
      r2
    );
    check(
      "pending-filter reply mentions 'pending' status",
      /pending/i.test(r2),
      r2
    );

    // ── 4. Lookup by 8-char short id (get_order_by_id) ──
    console.log(`\n4. Turn → "check order ${test.shortId}"`);
    const r3 = await turn(ctx, `check order ${test.shortId}`);
    console.log(`   bot: ${lastReply(ctx).slice(0, 250)}`);
    check(
      "single-order reply contains the test customer name",
      r3.includes(MARKER_FIRST_NAME),
      r3
    );
    // Gemini sometimes summarises and drops the city — but the total is
    // a value the agent only knows from the tool return, so it's a stronger
    // signal that get_order_by_id actually ran for our row.
    check(
      "single-order reply contains the test order's total (150)",
      /150/.test(r3),
      r3
    );

    // ── 5. Lookup by full UUID ──
    console.log(`\n5. Turn → paste full UUID ${test.id}`);
    const r4 = await turn(ctx, `check order ${test.id}`);
    console.log(`   bot: ${lastReply(ctx).slice(0, 250)}`);
    check(
      "full-UUID lookup also returns our customer",
      r4.includes(MARKER_FIRST_NAME),
      r4
    );

    // ── 6. Analytics ──
    console.log('\n6. Turn → "show me store analytics"');
    const r5 = await turn(ctx, "show me store analytics");
    console.log(`   bot: ${lastReply(ctx).slice(0, 250)}`);
    check(
      "analytics reply mentions revenue or orders",
      /revenue|orders|analytics/i.test(r5),
      r5
    );

    console.log("\n─ All order-flow steps verified end-to-end ─");
  } finally {
    console.log("\n7. Cleanup test order");
    await deleteTestOrder(test.id);
    console.log("  ✓ deleted");
  }
}

main().catch((err) => {
  console.error("\n✗ FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
