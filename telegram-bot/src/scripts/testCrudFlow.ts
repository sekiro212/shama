/**
 * End-to-end create → update → delete test for "Maj Island".
 *
 * Drives the real agent loop through Gemini, then EXECUTES each pending
 * confirmation against the live Supabase database (the bot's normal flow
 * stops at the confirmation step and waits for a button tap — this script
 * simulates the tap).
 *
 * Run with:  npm run test:crud
 *
 * Requires telegram-bot/.env with all the same keys as the dev bot.
 */

import type { Context as TelegrafContext } from "telegraf";
import { runAgent } from "../agent/agent";
import { executeConfirmation } from "../confirmation/machine";
import { supabase } from "../services/supabase";
import type { BotSession, BotLanguage } from "../types";

// ─── Fake Telegraf context ──────────────────────────────────────────────────
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
    chat: { id: 1234 },
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

// ─── Helpers ────────────────────────────────────────────────────────────────
function lastReply(ctx: FakeContext): string {
  return ctx.replies.length > 0
    ? ctx.replies[ctx.replies.length - 1].text
    : "(no reply)";
}

function allRepliesAfter(ctx: FakeContext, idx: number): string {
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
  await runAgent(
    ctx as unknown as TelegrafContext & { session: BotSession },
    text,
    lang
  );
  return allRepliesAfter(ctx, before);
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

// ─── DB verification helpers (use the same supabase client the bot uses) ───
async function fetchProductsByNameLike(pattern: string) {
  const { data, error } = await supabase
    .from("perfumes")
    .select("id, name, price, size, gender, stock_quantity, has_samples")
    .ilike("name", `%${pattern}%`);
  if (error) throw new Error(`Lookup failed: ${error.message}`);
  return data ?? [];
}

async function fetchProductById(id: string) {
  const { data, error } = await supabase
    .from("perfumes")
    .select("id, name, price, size, gender, stock_quantity, has_samples")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Lookup failed: ${error.message}`);
  return data;
}

async function fetchSamplesForProduct(perfumeId: string) {
  const { data, error } = await supabase
    .from("perfume_samples")
    .select("size, price")
    .eq("perfume_id", perfumeId)
    .order("size");
  if (error) throw new Error(`Samples lookup failed: ${error.message}`);
  return data ?? [];
}

/**
 * Extracts a UUID from a string. The bot's productCreated reply is
 * "✅ Product created!\nID: <uuid>" — we pull the UUID out so the rest of
 * the test can reference the row by its real id.
 */
function extractUuid(text: string): string | null {
  const m = text.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i
  );
  return m ? m[0] : null;
}

// ─── Test flow ──────────────────────────────────────────────────────────────
const PRODUCT_NAME = "Maj Island";

async function cleanupExisting() {
  // Match both "Maj Island" and "Majd Island" (Gemini sometimes
  // transliterates to the latter on the way through Arabic).
  const leftovers = [
    ...(await fetchProductsByNameLike("maj island")),
    ...(await fetchProductsByNameLike("majd island")),
  ];
  const seen = new Set<string>();
  for (const p of leftovers) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    console.log(`  ℹ leftover "${p.name}" (id=${p.id}) — deleting first`);
    await supabase.from("perfume_samples").delete().eq("perfume_id", p.id);
    await supabase.from("perfume_images").delete().eq("perfume_id", p.id);
    await supabase.from("perfumes").delete().eq("id", p.id);
  }
}

async function main() {
  console.log(`─ E2E CRUD test for "${PRODUCT_NAME}" ─\n`);

  // ── 0. Pre-clean ──
  console.log("0. Pre-clean any leftover row from previous runs");
  await cleanupExisting();
  console.log("  ✓ clean slate\n");

  const ctx = makeCtx("en");

  // ── 1. CREATE — turn 1: just the name ──
  console.log(`1. Turn 1 → "create a product called ${PRODUCT_NAME}"`);
  const r1 = await turn(ctx, `create a product called ${PRODUCT_NAME}`);
  console.log(`   bot: ${lastReply(ctx).slice(0, 220)}`);
  // Should NOT have a confirmation yet
  check(
    "agent did not auto-create with hallucinated values",
    ctx.session.confirmation === null,
    JSON.stringify(ctx.session.confirmation)
  );
  // Should ask for missing fields
  const askedForFields = /price|size|gender|stock/i.test(r1);
  check("agent asked for missing fields (price/size/gender/stock)", askedForFields, r1);

  // ── 2. CREATE — turn 2: provide the 4 required fields ──
  console.log("\n2. Turn 2 → provide price, size, gender, stock");
  const r2 = await turn(
    ctx,
    "the price is 180 LYD, size 100ml, men, stock 15"
  );
  console.log(`   bot: ${lastReply(ctx).slice(0, 220)}`);
  // The agent should now ask about samples (or create with has_samples=false).
  // We accept either, but we want to drive it through the samples flow, so
  // we expect a samples question.
  if (ctx.session.confirmation) {
    console.log("  ℹ agent created without asking about samples — this run will skip step 3");
  } else {
    check(
      "agent asked about samples",
      /sample/i.test(r2),
      r2
    );
  }

  // ── 3. CREATE — turn 3: provide samples ──
  if (!ctx.session.confirmation) {
    console.log("\n3. Turn 3 → provide samples 3ml @ 6 LYD, 5ml @ 10 LYD");
    const r3 = await turn(ctx, "yes, 3ml at 6 LYD and 5ml at 10 LYD");
    console.log(`   bot: ${lastReply(ctx).slice(0, 220)}`);
    // Re-read into a local — TS narrowed the field to `null` from the
    // outer `if`, but `turn()` mutates session.confirmation as a side
    // effect. The cast restores the union so the .type check below can
    // narrow it correctly.
    const conf = ctx.session.confirmation as BotSession["confirmation"];
    check(
      "create_product confirmation queued",
      conf?.type === "create",
      JSON.stringify(conf).slice(0, 400)
    );
    if (conf?.type === "create") {
      const draft = conf.payload;
      check("draft.name = Maj Island", draft.name.toLowerCase().includes("maj"));
      check("draft.price = 180", draft.price === 180, `got ${draft.price}`);
      check("draft.size = 100ml", draft.size === "100ml", `got ${draft.size}`);
      check("draft.gender = men", draft.gender === "men", `got ${draft.gender}`);
      check("draft.stock = 15", draft.stock_quantity === 15, `got ${draft.stock_quantity}`);
      check("draft.has_samples = true", draft.has_samples === true);
      check(
        "draft has 2 samples",
        Array.isArray(draft.samples) && draft.samples.length === 2,
        JSON.stringify(draft.samples)
      );
    }
  }

  // ── 4. CREATE — execute the confirmation, hitting Supabase ──
  console.log("\n4. Execute create confirmation → write to Supabase");
  const beforeCreateExec = ctx.replies.length;
  await executeConfirmation(
    ctx as unknown as TelegrafContext & { session: BotSession },
    "en"
  );
  const createReply = allRepliesAfter(ctx, beforeCreateExec);
  console.log(`   bot: ${createReply.slice(0, 220)}`);
  check(
    "confirmation cleared after execution",
    ctx.session.confirmation === null
  );
  check(
    "create reply contains success marker",
    /created/i.test(createReply),
    createReply
  );

  // ── 5. Verify with Supabase ──
  // Pull the new id out of the bot's "ID: <uuid>" reply rather than guessing
  // by name — Gemini sometimes transliterates "Maj Island" to "Majd Island".
  const productId = extractUuid(createReply);
  check(
    "bot reply contained a UUID",
    productId !== null,
    `reply: ${createReply.slice(0, 200)}`
  );
  if (!productId) throw new Error("No UUID in create reply — cannot continue");

  console.log(`\n5. Verify row exists in Supabase (id=${productId})`);
  const created = await fetchProductById(productId);
  check(
    `row found in perfumes table for id=${productId}`,
    created !== null,
    JSON.stringify(created)
  );
  if (!created) throw new Error("Created row not found — cannot continue");
  console.log(`   ${JSON.stringify(created)}`);
  check("name contains 'Maj' (or transliteration)", /maj/i.test(created.name), created.name);
  check("price stored = 180", Number(created.price) === 180, String(created.price));
  check("size stored = 100ml", created.size === "100ml");
  check("gender stored = men", created.gender === "men");
  check("stock stored = 15", created.stock_quantity === 15);
  check("has_samples stored = true", created.has_samples === true);

  const samples = await fetchSamplesForProduct(productId);
  console.log(`   samples: ${JSON.stringify(samples)}`);
  check(`exactly 2 sample rows for ${productId}`, samples.length === 2);

  // ── 6. UPDATE ──
  // Use the actually-stored name (Gemini may transliterate "Maj Island" to
  // "Majd Island" during create) — that's what an admin would see in the
  // bot's preview and type back.
  const storedName = created.name;
  console.log(`\n6. Turn → "change ${storedName} price to 220"`);
  // Reset history so the model doesn't get confused by leftover create context
  ctx.session.history = [];
  const r4 = await turn(ctx, `change ${storedName} price to 220`);
  console.log(`   bot: ${lastReply(ctx).slice(0, 220)}`);
  check(
    "update_product confirmation queued",
    ctx.session.confirmation?.type === "update",
    JSON.stringify(ctx.session.confirmation).slice(0, 400)
  );
  if (ctx.session.confirmation?.type === "update") {
    const payload = ctx.session.confirmation.payload;
    check(
      "update targets the right product id",
      payload.id === productId,
      `expected ${productId}, got ${payload.id}`
    );
    check(
      "update changes include price=220",
      Number((payload.changes as Record<string, unknown>).price) === 220,
      JSON.stringify(payload.changes)
    );
  }

  console.log("\n7. Execute update confirmation → write to Supabase");
  await executeConfirmation(
    ctx as unknown as TelegrafContext & { session: BotSession },
    "en"
  );

  console.log("\n8. Verify update landed in Supabase");
  const updated = await fetchProductById(productId);
  console.log(`   ${JSON.stringify(updated)}`);
  check("row still exists after update", updated !== null);
  check(
    "price updated to 220",
    updated !== null && Number(updated.price) === 220,
    `got ${updated?.price}`
  );

  // ── 9. DELETE ──
  console.log(`\n9. Turn → "delete ${storedName}"`);
  ctx.session.history = [];
  const r5 = await turn(ctx, `delete ${storedName}`);
  console.log(`   bot: ${lastReply(ctx).slice(0, 220)}`);
  check(
    "delete_product confirmation queued",
    ctx.session.confirmation?.type === "delete",
    JSON.stringify(ctx.session.confirmation).slice(0, 400)
  );
  if (ctx.session.confirmation?.type === "delete") {
    check(
      "delete targets the right product id",
      ctx.session.confirmation.payload.id === productId
    );
  }

  console.log("\n10. Execute delete confirmation → remove from Supabase");
  await executeConfirmation(
    ctx as unknown as TelegrafContext & { session: BotSession },
    "en"
  );

  console.log("\n11. Verify row is gone from Supabase");
  const deleted = await fetchProductById(productId);
  check("row no longer exists", deleted === null, JSON.stringify(deleted));

  const orphanSamples = await fetchSamplesForProduct(productId);
  check(
    "no orphan sample rows",
    orphanSamples.length === 0,
    JSON.stringify(orphanSamples)
  );

  console.log("\n─ All CRUD steps verified end-to-end ─");
}

main().catch((err) => {
  console.error("\n✗ FATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
