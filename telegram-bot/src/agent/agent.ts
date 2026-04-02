import { GoogleGenAI } from "@google/genai";
import type { Context } from "telegraf";
import type { BotSession, BotLanguage } from "../types";
import { config } from "../config";
import { toolDeclarations } from "./tools";
import { executeTool } from "./toolExecutor";
import {
  appendUserMessage,
  appendModelMessage,
  appendToolCall,
  appendToolResult,
  trimHistory,
} from "./memory";
import { withRetry, withTimeout } from "../utils/retry";

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const MAX_ITERATIONS = 5;

function buildSystemPrompt(lang: BotLanguage): string {
  const isAr = lang === "ar";
  return isAr
    ? `أنت مساعد ذكي لإدارة متجر عطور يُدعى "شاما". مهمتك مساعدة المسؤول في إدارة المنتجات والطلبات والمخزون.
رد دائماً بالعربية. كن موجزاً ومهنياً.
عند إنشاء أو تحديث أو حذف منتج، استخدم الأداة المناسبة دائماً — لا تطلب تأكيداً بالنص، الواجهة ستتولى ذلك.
عند البحث عن منتج، استخدم search_products أولاً للحصول على المعرّف الصحيح.`
    : `You are an intelligent admin assistant for a perfume store called "Shama". Help the admin manage products, orders, and inventory.
Always reply in English. Be concise and professional.
When creating, updating, or deleting products, always use the appropriate tool — do not ask for text confirmation, the UI will handle that.
When looking up a product for update/delete, use search_products first to get the correct ID.`;
}

export async function runAgent(
  ctx: Context & { session: BotSession },
  userText: string,
  lang: BotLanguage
): Promise<void> {
  const session = ctx.session;

  // Step 1: Append user message to history
  session.history = appendUserMessage(session.history, userText);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Step 2: Call Gemini with tools
    // 25s timeout — Gemini with large context can take 10-15s
    const response = await withRetry(() =>
      withTimeout(() =>
        ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: session.history,
          config: {
            tools: [{ functionDeclarations: toolDeclarations }],
            systemInstruction: buildSystemPrompt(lang),
          },
        }), 25_000
      )
    );

    // Step 3: Get the candidate
    const candidate = response.candidates?.[0];
    if (!candidate) {
      await ctx.reply("No response from AI.");
      return;
    }

    const parts = candidate.content?.parts ?? [];

    // Step 4: Check for function call vs text response
    // Note: only the first function call is processed per iteration.
    // Gemini may return multiple in one response; we handle one at a time
    // to keep the loop predictable. The confirmation pattern also requires
    // a single pending action at a time.
    const functionCallPart = parts.find((p) => p.functionCall != null);

    if (!functionCallPart) {
      // Model returned text — done
      const textPart = parts.find((p) => p.text != null);
      const modelText = textPart?.text ?? "";

      session.history = appendModelMessage(session.history, modelText);
      session.history = trimHistory(session.history);

      if (modelText) {
        await ctx.reply(modelText, { parse_mode: "HTML" });
      }
      return;
    }

    // Step 5: Handle function call
    const { name: toolName, args } = functionCallPart.functionCall!;
    const toolArgs = (args ?? {}) as Record<string, unknown>;

    // Append tool call to history
    session.history = appendToolCall(session.history, toolName!, toolArgs);

    // Execute the tool
    const result = await executeTool(toolName!, toolArgs, lang);

    // Append tool result to history
    session.history = appendToolResult(session.history, toolName!, result.text);

    // If confirmation needed: store it and stop
    if (result.confirmation) {
      session.confirmation = result.confirmation;
      session.history = trimHistory(session.history);
      await ctx.reply(result.confirmation.preview, { parse_mode: "HTML" });
      return;
    }

    // Trim history between iterations to prevent unbounded growth
    session.history = trimHistory(session.history);

    // No confirmation — loop back to let Gemini respond with text
  }

  // Exceeded max iterations
  session.history = trimHistory(session.history);
  await ctx.reply("Request took too many steps. Please try again.");
}
