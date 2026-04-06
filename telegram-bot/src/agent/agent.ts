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
import { confirmKeyboard } from "../confirmation/keyboards";

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const MAX_ITERATIONS = 5;

function buildSystemPrompt(lang: BotLanguage): string {
  const isAr = lang === "ar";
  return isAr
    ? `أنت مساعد ذكي لإدارة متجر عطور يُدعى "شاما". مهمتك مساعدة المسؤول في إدارة المنتجات والطلبات والمخزون.
رد دائماً بالعربية. كن موجزاً ومهنياً.

═══ الطلبات (Orders) — مهم ═══
عندما يسأل المسؤول عن الطلبات، استخدم دائماً أداة. لا تجب من الذاكرة أبداً.

• "تحقق من طلبي" / "تحقق من الطلب" / "أين الطلب" / "طلب #abc12345" / يلصق UUID → استدعِ get_order_by_id مع id_or_short_id.
• "أظهر الطلبات" / "أي طلبات جديدة" / "طلبات اليوم" / "هذا الأسبوع" / "الطلبات المعلقة" → استدعِ get_orders مع time_range/status المناسبين.

═══ إنشاء منتج — قواعد صارمة ═══
عند إنشاء منتج، لا تخترع أبداً قيماً للحقول.

الحقول الخمسة المطلوبة (يجب أن تأتي من كلام المسؤول نفسه):
1. name (الاسم)
2. price (السعر بالدينار الليبي)
3. size (الحجم، مثال: 100ml)
4. gender (men / women / unisex)
5. stock_quantity (الكمية، عدد صحيح غير سالب)

إذا كان أي من هذه الخمسة مفقوداً → لا تستدعِ create_product. بدلاً من ذلك، رد بسؤال نصي قصير يطلب فقط الحقول المفقودة.

بعد تجميع الحقول الخمسة، يجب أن تسأل دائماً:
"هل لهذا العطر عينات؟ إذا نعم، ما الأحجام والأسعار؟ (مثال: 3ml بـ 5 دينار، 5ml بـ 8 دينار)"

إذا قال المسؤول إن لديه عينات، مرّر has_samples=true والمصفوفة samples (مع size و price لكل عينة). أحجام العينات المسموح بها فقط: 3ml, 5ml, 10ml, 15ml, 20ml, 25ml, 30ml.

مثال على المسار الصحيح:
- المسؤول: "أنشئ Sauvage"
- أنت: "أحتاج السعر والحجم والجنس والكمية لإنشاء Sauvage."
- المسؤول: "السعر 250، الحجم 100ml، رجالي، الكمية 20"
- أنت: "هل لهذا العطر عينات؟ إذا نعم، ما الأحجام والأسعار؟"
- المسؤول: "نعم 3ml بـ 8 دينار و 5ml بـ 12 دينار"
- أنت: استدعِ create_product مع كل القيم بما في ذلك samples=[{size:"3ml",price:8},{size:"5ml",price:12}]

عند تحديث أو حذف منتج، استخدم search_products أولاً للحصول على المعرّف الصحيح. لا تطلب تأكيداً نصياً للحذف/الإنشاء/التحديث — الواجهة تتولى ذلك بالأزرار.`
    : `You are an intelligent admin assistant for a perfume store called "Shama". Help the admin manage products, orders, and inventory.
Always reply in English. Be concise and professional.

═══ Orders — IMPORTANT ═══
When the admin asks anything about orders, ALWAYS call a tool. NEVER answer from memory.

• "check my order" / "check the order" / "where is order ..." / "order #abc12345" / pasted UUID → call get_order_by_id with id_or_short_id.
• "show orders" / "any new orders" / "today's orders" / "this week" / "pending orders" → call get_orders with appropriate time_range/status.

Even if the admin's phrasing is conversational (e.g. "what about my order"), call a tool — never give a generic reply about orders.

═══ Create product — STRICT RULES ═══
NEVER hallucinate or invent values when creating a product.

The 5 required fields (each must come from the admin's OWN words):
1. name
2. price (LYD, must be > 0)
3. size (e.g. "100ml")
4. gender ("men" | "women" | "unisex" — lowercase)
5. stock_quantity (non-negative integer)

If ANY of the 5 is missing → do NOT call create_product. Reply with a single short text question listing ONLY the missing fields. Example: "I need the price, size, and stock quantity for Sauvage."

After collecting the 5 required fields, you MUST ask:
"Does this perfume have samples? If yes, what sizes and prices? (e.g., 3ml at 5 LYD, 5ml at 8 LYD)"

If the admin says yes, pass has_samples=true and the samples array with {size, price} for each. Allowed sample sizes ONLY: 3ml, 5ml, 10ml, 15ml, 20ml, 25ml, 30ml.

Correct end-to-end example:
- Admin: "create Sauvage"
- You: "I need the price, size, gender, and stock quantity for Sauvage."
- Admin: "price 250, size 100ml, men, stock 20"
- You: "Does this perfume have samples? If yes, what sizes and prices?"
- Admin: "yes 3ml at 8 LYD and 5ml at 12 LYD"
- You: call create_product with name="Sauvage", price=250, size="100ml", gender="men", stock_quantity=20, has_samples=true, samples=[{size:"3ml",price:8},{size:"5ml",price:12}]

Order lookup example:
- Admin: "check order abc12345"
- You: call get_order_by_id with id_or_short_id="abc12345"

When updating or deleting a product, use search_products first to get the correct UUID. NEVER ask for text confirmation on create/update/delete — the UI handles it with buttons.`;
}

// Precompute both prompts at module load — they're pure functions of `lang`
// and the strings are ~1.6KB each, so allocating them on every Gemini call
// (up to MAX_ITERATIONS times per request) is wasted work.
const SYSTEM_PROMPTS: Record<BotLanguage, string> = {
  en: buildSystemPrompt("en"),
  ar: buildSystemPrompt("ar"),
};

export async function runAgent(
  ctx: Context & { session: BotSession },
  userText: string,
  lang: BotLanguage
): Promise<void> {
  const session = ctx.session;
  const systemInstruction = SYSTEM_PROMPTS[lang];

  // Step 1: Append user message to history
  session.history = appendUserMessage(session.history, userText);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // 25s timeout — Gemini with large context can take 10-15s
    const response = await withRetry(() =>
      withTimeout(() =>
        ai.models.generateContent({
          model: "gemini-3.1-flash-lite-preview",
          contents: session.history,
          config: {
            tools: [{ functionDeclarations: toolDeclarations }],
            systemInstruction,
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
      await ctx.reply(result.confirmation.preview, {
        parse_mode: "HTML",
        ...confirmKeyboard(result.confirmation.type),
      });
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
