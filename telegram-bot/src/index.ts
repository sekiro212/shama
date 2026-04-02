import { Telegraf, session, Markup } from "telegraf";
import { config } from "./config";
import type { BotSession, BotLanguage } from "./types";
import { runAgent } from "./agent/agent";
import { analyzeImage } from "./services/gemini";
import { transcribeVoice } from "./services/voice";
import { downloadTelegramFile } from "./utils/fileDownload";
import { executeConfirmation, cancelConfirmation } from "./confirmation/machine";
import { t } from "./i18n/messages";
import { appendUserMessage } from "./agent/memory";

type BotContext = import("telegraf").Context & { session: BotSession };

const bot = new Telegraf<BotContext>(config.telegramToken);

// ── Session middleware ──
bot.use(session({
  defaultSession: (): BotSession => ({
    history: [],
    confirmation: null,
    language: "en",
  }),
}));

// ── Admin guard ──
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId || !config.adminChatIds.includes(userId)) {
    await ctx.reply(t("en", "unauthorized"));
    return;
  }
  return next();
});

// ── Helper ──
function getLang(ctx: BotContext): BotLanguage {
  return ctx.session.language ?? "en";
}

// ═════════════════════════════════════════════
// COMMANDS
// ═════════════════════════════════════════════

bot.command("start", async (ctx) => {
  const lang = getLang(ctx);
  await ctx.reply(
    t(lang, "welcome"),
    { parse_mode: "HTML" }
  );
});

bot.command("help", async (ctx) => {
  const lang = getLang(ctx);
  await ctx.reply(t(lang, "help"), { parse_mode: "HTML" });
});

bot.command("lang", async (ctx) => {
  await ctx.reply(
    "🌐 <b>Choose language / اختر اللغة</b>",
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🇬🇧 English", "lang_en"), Markup.button.callback("🇸🇦 العربية", "lang_ar")],
      ]),
    }
  );
});

bot.command("end", async (ctx) => {
  const lang = getLang(ctx);
  ctx.session.history = [];
  ctx.session.confirmation = null;
  await ctx.reply(t(lang, "cancelled"));
});

// ═════════════════════════════════════════════
// LANGUAGE CALLBACKS
// ═════════════════════════════════════════════

bot.action("lang_en", async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.language = "en";
  await ctx.reply("✅ Language set to English.");
});

bot.action("lang_ar", async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.language = "ar";
  await ctx.reply("✅ تم تعيين اللغة إلى العربية.");
});

// ═════════════════════════════════════════════
// CONFIRMATION CALLBACKS
// ═════════════════════════════════════════════

bot.action(/^confirm_(create|update|delete)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const lang = getLang(ctx);
  await executeConfirmation(ctx as BotContext, lang);
});

bot.action(/^cancel_(create|update|delete)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const lang = getLang(ctx);
  await cancelConfirmation(ctx as BotContext, lang);
});

// ═════════════════════════════════════════════
// PHOTO HANDLER — analyze image then run agent
// ═════════════════════════════════════════════

// NOTE: The photo flow is simplified — it analyzes the image and asks the
// agent to create the product based on the text description only. The raw
// image buffer is NOT forwarded to the agent or stored in the session; the
// agent creates the product from the AI-generated description without an
// actual image attached. Full image-upload-on-confirm can be added as a
// follow-up (would require storing the buffer in session and passing it
// through ProductDraft.imageBuffer before executeConfirmation).

bot.on("photo", async (ctx) => {
  const lang = getLang(ctx);
  const thinking = await ctx.reply(t(lang, "thinking"), { parse_mode: "HTML" });

  try {
    // Get highest-resolution photo
    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id;

    const { buffer, mimeType } = await downloadTelegramFile(bot as unknown as import("telegraf").Telegraf, fileId);
    const perfumeData = await analyzeImage(buffer, mimeType);

    // Build a natural language description of what was found for the agent
    const imageContext = [
      perfumeData.name ? `Name: ${perfumeData.name}` : "",
      perfumeData.brand ? `Brand: ${perfumeData.brand}` : "",
      perfumeData.description ? `Description: ${perfumeData.description.slice(0, 100)}` : "",
    ].filter(Boolean).join(", ");

    const userText = `[Photo analyzed] ${imageContext || "Perfume bottle photo received"}`;

    await ctx.telegram.deleteMessage(ctx.chat!.id, thinking.message_id).catch(() => {});
    await ctx.reply(`📸 ${userText}`, { parse_mode: "HTML" });

    // Append the analyzed data as a user message so agent knows what was in the photo
    ctx.session.history = appendUserMessage(
      ctx.session.history,
      `I sent a photo of a perfume bottle. The AI identified it as: ${imageContext}. Please create this product for me.`
    );

    // Run agent with the image context (history already has the user message)
    await runAgentWithExistingHistory(ctx, lang);
  } catch (err) {
    console.error("Photo error:", err);
    await ctx.telegram.deleteMessage(ctx.chat!.id, thinking.message_id).catch(() => {});
    await ctx.reply(t(lang, "errorGeneral"));
  }
});

// ═════════════════════════════════════════════
// VOICE HANDLER — transcribe then run agent
// ═════════════════════════════════════════════

bot.on("voice", async (ctx) => {
  const lang = getLang(ctx);
  const thinking = await ctx.reply(t(lang, "voiceTranscribing"), { parse_mode: "HTML" });

  try {
    const fileId = ctx.message.voice.file_id;
    const { buffer, mimeType } = await downloadTelegramFile(bot as unknown as import("telegraf").Telegraf, fileId);
    const text = await transcribeVoice(buffer, mimeType);

    await ctx.telegram.deleteMessage(ctx.chat!.id, thinking.message_id).catch(() => {});

    if (!text.trim()) {
      await ctx.reply(t(lang, "errorGeneral"));
      return;
    }

    await ctx.reply(`${t(lang, "voiceTranscribed")}${text}`);
    await runAgent(ctx as BotContext, text, lang);
  } catch (err) {
    console.error("Voice error:", err);
    await ctx.telegram.deleteMessage(ctx.chat!.id, thinking.message_id).catch(() => {});
    await ctx.reply(t(lang, "errorGeneral"));
  }
});

// ═════════════════════════════════════════════
// TEXT HANDLER — run agent
// ═════════════════════════════════════════════

bot.on("text", async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return;  // ignore commands caught above
  const lang = getLang(ctx);
  await runAgent(ctx as BotContext, text, lang);
});

// ─── Helper: run agent without prepending another user message ───
// The photo handler already appended the user message to history.
// We extract the last message text, remove it, then call runAgent normally
// so runAgent re-appends it (avoiding double entries in history).
async function runAgentWithExistingHistory(ctx: BotContext, lang: BotLanguage) {
  const lastMsg = ctx.session.history[ctx.session.history.length - 1];
  const lastText = (lastMsg?.parts?.[0] as { text?: string })?.text ?? "process the photo";
  // Remove the last message we added (runAgent will re-add it)
  ctx.session.history = ctx.session.history.slice(0, -1);
  await runAgent(ctx as BotContext, lastText, lang);
}

// ═════════════════════════════════════════════
// ERROR HANDLER & LAUNCH
// ═════════════════════════════════════════════

bot.catch((err, ctx) => {
  console.error(`[Bot Error] ${ctx.updateType}`, err);
  ctx.reply(t("en", "errorGeneral")).catch(() => {});
});

bot.launch()
  .then(() => console.log("✅ Shama AI Admin Bot running..."))
  .catch((err) => {
    console.error("❌ Failed to start:", err);
    process.exit(1);
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
