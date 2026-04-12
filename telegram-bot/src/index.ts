import { Telegraf, session, Markup } from "telegraf";
import { config } from "./config";
import type { BotSession, BotLanguage, ImageCollectionState } from "./types";
import { runAgent } from "./agent/agent";
import { analyzeImage } from "./services/gemini";
import { transcribeVoice } from "./services/voice";
import { generateProductImage } from "./services/imageGeneration";
import { downloadTelegramFile } from "./utils/fileDownload";
import { savePerfumeImage } from "./services/supabase";
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
    imageCollection: null,
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
  ctx.session.imageCollection = null;
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
// MEDIA GROUP DEBOUNCE (multiple photos at once)
// ═════════════════════════════════════════════

interface MediaGroupEntry {
  photos: Array<{ buffer: Buffer; mimeType: string }>;
  timer: ReturnType<typeof setTimeout>;
  ctx: BotContext;
  lang: BotLanguage;
}

const mediaGroupBuffer = new Map<string, MediaGroupEntry>();

async function handleMediaGroupPhoto(ctx: BotContext, mediaGroupId: string, lang: BotLanguage) {
  const photos = (ctx.message as unknown as { photo: Array<{ file_id: string }> }).photo;
  const fileId = photos[photos.length - 1].file_id;

  // Download immediately — can't access Telegram file later
  const { buffer, mimeType } = await downloadTelegramFile(
    bot as unknown as import("telegraf").Telegraf, fileId
  );

  const existing = mediaGroupBuffer.get(mediaGroupId);
  if (existing) {
    existing.photos.push({ buffer, mimeType });
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => processMediaGroup(mediaGroupId), 800);
  } else {
    const timer = setTimeout(() => processMediaGroup(mediaGroupId), 800);
    mediaGroupBuffer.set(mediaGroupId, {
      photos: [{ buffer, mimeType }],
      timer,
      ctx,
      lang,
    });
  }
}

async function processMediaGroup(mediaGroupId: string) {
  const entry = mediaGroupBuffer.get(mediaGroupId);
  if (!entry) return;
  mediaGroupBuffer.delete(mediaGroupId);

  const { photos, ctx, lang } = entry;
  const imageCol = ctx.session.imageCollection;
  if (!imageCol) return;

  const stopTyping = startTypingLoop(ctx);
  try {
    for (const photo of photos) {
      const isPrimary = imageCol.imageCount === 0;
      const displayOrder = imageCol.imageCount + 1;
      await savePerfumeImage(imageCol.perfumeId, photo.buffer, photo.mimeType, isPrimary, displayOrder);
      imageCol.imageCount++;
    }

    await ctx.reply(
      t(lang, "mediaGroupSaved")
        .replace("{n}", String(photos.length))
        .replace("{total}", String(imageCol.imageCount))
        .replace("{name}", imageCol.perfumeName)
    );
  } catch (err) {
    console.error("Media group save error:", err);
    await ctx.reply(t(lang, "errorImageUpload"));
  } finally {
    stopTyping();
  }
}

// ═════════════════════════════════════════════
// AI IMAGE GENERATION
// ═════════════════════════════════════════════

async function handleGenerateImage(ctx: BotContext, imageCol: ImageCollectionState, lang: BotLanguage) {
  const stopTyping = startTypingLoop(ctx);
  const statusMsg = await ctx.reply(t(lang, "generatingImage"));

  try {
    const { buffer, mimeType } = await generateProductImage(
      imageCol.perfumeName, "", ""
    );

    const isPrimary = imageCol.imageCount === 0;
    const displayOrder = imageCol.imageCount + 1;

    const publicUrl = await savePerfumeImage(
      imageCol.perfumeId, buffer, mimeType, isPrimary, displayOrder
    );
    imageCol.imageCount++;

    await ctx.telegram.deleteMessage(ctx.chat!.id, statusMsg.message_id).catch(() => {});

    // Show generated image to admin
    await ctx.replyWithPhoto({ url: publicUrl });
    await ctx.reply(
      t(lang, "imageGenerated").replace("{name}", imageCol.perfumeName)
    );
  } catch (err) {
    console.error("Image generation error:", err);
    await ctx.telegram.deleteMessage(ctx.chat!.id, statusMsg.message_id).catch(() => {});
    await ctx.reply(t(lang, "errorImageGeneration"));
  } finally {
    stopTyping();
  }
}

// ═════════════════════════════════════════════
// PHOTO HANDLER
// ═════════════════════════════════════════════

bot.on("photo", async (ctx) => {
  const lang = getLang(ctx);
  const imageCol = ctx.session.imageCollection;

  // ── Image collection mode: save photo to product ──
  if (imageCol) {
    const mediaGroupId = (ctx.message as unknown as Record<string, unknown>).media_group_id as string | undefined;
    if (mediaGroupId) {
      await handleMediaGroupPhoto(ctx as BotContext, mediaGroupId, lang);
      return;
    }

    // Single photo — save directly
    const stopTyping = startTypingLoop(ctx);
    try {
      const photos = ctx.message.photo;
      const fileId = photos[photos.length - 1].file_id;
      const { buffer, mimeType } = await downloadTelegramFile(
        bot as unknown as import("telegraf").Telegraf, fileId
      );

      const isPrimary = imageCol.imageCount === 0;
      const displayOrder = imageCol.imageCount + 1;

      await savePerfumeImage(imageCol.perfumeId, buffer, mimeType, isPrimary, displayOrder);
      imageCol.imageCount++;

      await ctx.reply(
        t(lang, "imageSaved")
          .replace("{n}", String(imageCol.imageCount))
          .replace("{name}", imageCol.perfumeName)
      );
    } catch (err) {
      console.error("Image save error:", err);
      await ctx.reply(t(lang, "errorImageUpload"));
    } finally {
      stopTyping();
    }
    return;
  }

  // ── Normal mode: analyze image for product creation ──
  const stopTyping = startTypingLoop(ctx);
  const thinking = await ctx.reply(t(lang, "thinking"), { parse_mode: "HTML" });

  try {
    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id;

    const { buffer, mimeType } = await downloadTelegramFile(bot as unknown as import("telegraf").Telegraf, fileId);
    const perfumeData = await analyzeImage(buffer, mimeType);

    const imageContext = [
      perfumeData.name ? `Name: ${perfumeData.name}` : "",
      perfumeData.brand ? `Brand: ${perfumeData.brand}` : "",
      perfumeData.description ? `Description: ${perfumeData.description.slice(0, 100)}` : "",
    ].filter(Boolean).join(", ");

    const userText = `[Photo analyzed] ${imageContext || "Perfume bottle photo received"}`;

    await ctx.telegram.deleteMessage(ctx.chat!.id, thinking.message_id).catch(() => {});
    await ctx.reply(`📸 ${userText}`, { parse_mode: "HTML" });

    ctx.session.history = appendUserMessage(
      ctx.session.history,
      `I sent a photo of a perfume bottle. The AI identified it as: ${imageContext}. Please create this product for me.`
    );

    await runAgentWithExistingHistory(ctx as BotContext, lang);
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
// TEXT HANDLER — image collection or agent
// ═════════════════════════════════════════════

bot.on("text", async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return;
  const lang = getLang(ctx);

  const imageCol = ctx.session.imageCollection;
  if (imageCol) {
    const lower = text.toLowerCase();

    // Exit image collection
    if (lower === "done" || lower === "skip" || lower === "تم" || lower === "تخطي") {
      const count = imageCol.imageCount;
      ctx.session.imageCollection = null;
      await ctx.reply(
        t(lang, "imageCollectionDone")
          .replace("{n}", String(count))
          .replace("{name}", imageCol.perfumeName)
      );
      return;
    }

    // AI image generation — any mention of "image"/"صورة" in image mode triggers it
    if (lower.includes("image") || lower.includes("صورة") ||
        lower.includes("generate") || lower.includes("توليد")) {
      await handleGenerateImage(ctx as BotContext, imageCol, lang);
      return;
    }

    // Other text: pass through to agent (admin not locked out)
  }

  await runAgentWithFeedback(ctx as BotContext, text, lang);
});

// ─── Helper: run agent without prepending another user message ───
async function runAgentWithExistingHistory(ctx: BotContext, lang: BotLanguage) {
  const lastMsg = ctx.session.history[ctx.session.history.length - 1];
  const lastText = lastMsg?.content ?? "process the photo";
  ctx.session.history = ctx.session.history.slice(0, -1);
  await runAgentWithFeedback(ctx, lastText, lang);
}

// ─── Helper: run agent with live progress feedback in Telegram ───
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
    if (newText === lastStatusText) return;
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
