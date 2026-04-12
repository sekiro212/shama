import type { Context } from "telegraf";
import type { BotSession, BotLanguage, ChatMessage } from "../types";
import { config } from "../config";
import { toolDeclarations } from "./tools";
import { executeTool, type ToolResult } from "./toolExecutor";
import {
  appendUserMessage,
  appendModelMessage,
  appendToolCall,
  appendToolResult,
  trimHistory,
} from "./memory";
import { withRetry, withTimeout } from "../utils/retry";
import { confirmKeyboard } from "../confirmation/keyboards";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-5.2";

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

═══ بحث الويب لتفاصيل العطور ═══
لديك إمكانية البحث في الويب. عند إنشاء منتج ولا تعرف المكونات العطرية أو الوصف، ابحث في الويب أولاً (مثال: "Nishane Hacivat fragrance notes" أو "عطر نيشان هاسيفات مكونات"). استخدم البيانات الحقيقية من Fragrantica أو Parfumo — لا تخمن أبداً.

═══ إنشاء دفعة ═══
إذا طلب المسؤول إنشاء عدة عطور دفعة واحدة (نصياً أو صوتياً)، عالجها واحدة تلو الأخرى:
1. اجمع الحقول الخمسة المطلوبة للعطر الأول
2. اسأل عن العينات
3. استدعِ create_product (يظهر زر التأكيد)
4. بعد التأكيد، انتقل للعطر التالي

═══ الصور ═══
يمكنك توليد صور تسويقية بالذكاء الاصطناعي. عندما يطلب المسؤول إنشاء صورة لمنتج:
1. استخدم search_products للحصول على UUID المنتج
2. استدعِ generate_product_image مع UUID
هذا يعمل لأي منتج موجود.

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

If ANY of the 5 is missing → do NOT call create_product. Reply with a single short text question listing ONLY the missing fields.

After collecting the 5 required fields, you MUST ask:
"Does this perfume have samples? If yes, what sizes and prices? (e.g., 3ml at 5 LYD, 5ml at 8 LYD)"

If the admin says yes, pass has_samples=true and the samples array with {size, price} for each. Allowed sample sizes ONLY: 3ml, 5ml, 10ml, 15ml, 20ml, 25ml, 30ml.

═══ Web Search for perfume details ═══
You have access to web search. When creating a product and you are unsure about fragrance notes, description, or Arabic translation, search the web first (e.g. search "Nishane Hacivat fragrance notes top heart base" or "عطر نيشان هاسيفات"). Use the real data from Fragrantica, Parfumo, or official brand sites — never guess notes.

═══ Batch creation ═══
If the admin asks to create multiple perfumes at once (via text or voice), process them ONE AT A TIME:
1. Collect the required 5 fields for the FIRST perfume
2. Ask about samples for that perfume
3. Call create_product for it (shows Confirm button)
4. After confirmation, move to the NEXT perfume
Do NOT try to create all at once — the confirmation UI handles one product at a time.

═══ Images ═══
You CAN generate AI marketing images. When the admin asks to create/generate/make an image for a product:
1. Use search_products to find the product UUID
2. Call generate_product_image with the UUID
This works for any existing product, not just newly created ones.

When updating or deleting a product, use search_products first to get the correct UUID. NEVER ask for text confirmation on create/update/delete — the UI handles it with buttons.`;
}

const SYSTEM_PROMPTS: Record<BotLanguage, string> = {
  en: buildSystemPrompt("en"),
  ar: buildSystemPrompt("ar"),
};

/** Status callback used to surface live progress to the Telegram user. */
export type AgentStatusCallback = (
  kind: "thinking" | "tool",
  toolName?: string
) => Promise<void> | void;

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason?: string;
  }>;
  error?: { message: string };
}

async function callOpenRouter(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<OpenRouterResponse> {
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    tools: [
      // OpenRouter server tool — model can search the web for accurate perfume data
      { type: "openrouter:web_search" } as unknown as (typeof toolDeclarations)[0],
      ...toolDeclarations,
    ],
    temperature: 0.3,
    max_tokens: 2048,
  };

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.openRouterApiKey}`,
      "HTTP-Referer": "https://shama.ly",
      "X-Title": "Shama Admin Bot",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`OpenRouter ${response.status}: ${errText.slice(0, 200)}`);
  }

  return response.json() as Promise<OpenRouterResponse>;
}

export async function runAgent(
  ctx: Context & { session: BotSession },
  userText: string,
  lang: BotLanguage,
  onStatus?: AgentStatusCallback
): Promise<void> {
  const session = ctx.session;
  const systemInstruction = SYSTEM_PROMPTS[lang];

  // Step 1: Append user message to history
  session.history = appendUserMessage(session.history, userText);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    await onStatus?.("thinking");

    // 20s per attempt × 2 retries
    const response = await withRetry(() =>
      withTimeout(() =>
        callOpenRouter(session.history, systemInstruction),
        20_000
      ),
      2
    );

    if (response.error) {
      await ctx.reply(`API error: ${response.error.message}`);
      return;
    }

    const choice = response.choices?.[0];
    if (!choice?.message) {
      await ctx.reply("No response from AI.");
      return;
    }

    const msg = choice.message;
    const toolCalls = msg.tool_calls;

    // No tool calls — model returned text
    if (!toolCalls || toolCalls.length === 0) {
      const modelText = msg.content ?? "";
      session.history = appendModelMessage(session.history, modelText);
      session.history = trimHistory(session.history);

      if (modelText) {
        await ctx.reply(modelText, { parse_mode: "HTML" });
      }
      return;
    }

    // Process first tool call only (one at a time for confirmation pattern)
    const tc = toolCalls[0];
    const toolName = tc.function.name;
    const toolCallId = tc.id;
    let toolArgs: Record<string, unknown>;
    try {
      toolArgs = JSON.parse(tc.function.arguments);
    } catch {
      toolArgs = {};
    }

    // Append assistant message with tool call to history
    session.history = appendToolCall(session.history, toolCallId, toolName, toolArgs);

    await onStatus?.("tool", toolName);

    // Execute the tool
    let result: ToolResult;
    try {
      result = await executeTool(toolName, toolArgs, lang);
    } catch (err) {
      console.error(`[Tool Error] ${toolName}:`, err);
      result = { text: `Tool error: ${err instanceof Error ? err.message : String(err)}` };
    }

    // Append tool result to history
    session.history = appendToolResult(session.history, toolCallId, toolName, result.text);

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

    session.history = trimHistory(session.history);
    // Loop back to let model respond with text
  }

  // Exceeded max iterations
  session.history = trimHistory(session.history);
  await ctx.reply("Request took too many steps. Please try again.");
}
