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
import { startTypingLoop } from "./utils/chatAction";

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
  try {
    await ctx.answerCbQuery();
    const lang = getLang(ctx);
    await executeConfirmation(ctx as BotContext, lang);
  } catch (err) {
    console.error("[Callback Error] confirm:", err);
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.reply(`❌ Confirm failed: ${msg.slice(0, 300)}`).catch(() => {});
  }
});

bot.action(/^cancel_(create|update|delete)$/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getLang(ctx);
    await cancelConfirmation(ctx as BotContext, lang);
  } catch (err) {
    console.error("[Callback Error] cancel:", err);
    await ctx.reply("❌ Cancel failed.").catch(() => {});
  }
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
  const stopTyping = startTypingLoop(ctx);
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
  } finally {
    stopTyping();
  }
});

// ═════════════════════════════════════════════
// VOICE HANDLER — transcribe then run agent
// ═════════════════════════════════════════════

bot.on("voice", async (ctx) => {
  const lang = getLang(ctx);
  const stopTyping = startTypingLoop(ctx);
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
    await runAgentWithFeedback(ctx as BotContext, text, lang);
  } catch (err) {
    console.error("Voice error:", err);
    await ctx.telegram.deleteMessage(ctx.chat!.id, thinking.message_id).catch(() => {});
    await ctx.reply(t(lang, "errorGeneral"));
  } finally {
    stopTyping();
  }
});

// ═════════════════════════════════════════════
// TEXT HANDLER — run agent
// ═════════════════════════════════════════════

bot.on("text", async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return;  // ignore commands caught above
  const lang = getLang(ctx);
  await runAgentWithFeedback(ctx as BotContext, text, lang);
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
  await runAgentWithFeedback(ctx, lastText, lang);
}

// ─── Helper: run agent with live progress feedback in Telegram ───
// Wraps runAgent with:
//  • a typing-indicator loop (re-sent every 4s while work runs)
//  • a single status message that gets edited as the agent moves through
//    "thinking" → "using tool: X" iterations, then deleted at the end.
// Both side effects are guarded so a transient Telegram API error never
// breaks the underlying request.
async function runAgentWithFeedback(
  ctx: BotContext,
  text: string,
  lang: BotLanguage
) {
  const stopTyping = startTypingLoop(ctx);
  let statusMsgId: number | undefined;
  let lastStatusText: string | undefined;
  const chatId = ctx.chat?.id;

  const setStatus = async (newText: string) => {
    if (newText === lastStatusText) return;  // avoid noisy edit churn
    if (!chatId) return;
    if (statusMsgId == null) {
      try {
        const m = await ctx.reply(newText);
        statusMsgId = m.message_id;
        lastStatusText = newText;
      } catch {
        /* ignore — status is best-effort */
      }
    } else {
      await ctx.telegram
        .editMessageText(chatId, statusMsgId, undefined, newText)
        .then(() => {
          lastStatusText = newText;
        })
        .catch(() => {
          /* ignore — status is best-effort */
        });
    }
  };

  try {
    await runAgent(ctx, text, lang, async (kind, toolName) => {
      if (kind === "thinking") {
        await setStatus(t(lang, "thinking"));
      } else {
        const template = t(lang, "usingTool");
        await setStatus(template.replace("{name}", toolName ?? ""));
      }
    });
  } catch (err) {
    console.error("[Agent Error]", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timed out")) {
      await ctx.reply("⏱ AI service timed out. Please try again.").catch(() => {});
    } else {
      await ctx.reply(`❌ Error: ${msg.slice(0, 200)}`).catch(() => {});
    }
  } finally {
    stopTyping();
    if (statusMsgId != null && chatId != null) {
      await ctx.telegram.deleteMessage(chatId, statusMsgId).catch(() => {});
    }
  }
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
