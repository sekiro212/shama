// ai-proxy — browser-invoked OpenRouter relay.
//
// Why this exists: aiService.ts used to call OpenRouter directly with
// VITE_OPENROUTER_API_KEY. Vite inlines every VITE_* value into the client
// bundle as a string literal, so the key shipped inside dist/assets/index-*.js
// and anyone could read it out of devtools and spend the account's credit.
//
// The key now lives only in this function's environment (OPENROUTER_API_KEY).
// The browser sends messages and a model choice; it never sees the credential.
//
// Deploy:  supabase functions deploy ai-proxy
// Secret:  supabase secrets set OPENROUTER_API_KEY=sk-or-...
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";

// Only models the storefront actually uses. Without this an attacker could
// point the relay at an arbitrarily expensive model and bill it to the account
// — the exposed key would effectively still be exposed, just one hop away.
const ALLOWED_MODELS = new Set([
  "openai/gpt-5.2",
  "anthropic/claude-sonnet-4-6",
  "google/gemini-3.1-flash-image-preview",
]);
const DEFAULT_MODEL = "openai/gpt-5.2";

// Ceilings, not defaults: a caller may ask for less but never for more.
const MAX_TOKENS_CAP = 8192;
const MAX_MESSAGES = 60;
const MAX_CHARS = 120_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!OPENROUTER_API_KEY) {
    console.error("ai-proxy: OPENROUTER_API_KEY is not set");
    return json({ error: "AI is not configured" }, 503);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const messages = payload.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "messages must be a non-empty array" }, 400);
  }
  if (messages.length > MAX_MESSAGES) {
    return json({ error: "Too many messages" }, 413);
  }

  let totalChars = 0;
  for (const m of messages) {
    if (
      typeof m !== "object" || m === null ||
      typeof (m as { role?: unknown }).role !== "string"
    ) {
      return json({ error: "Each message needs a role and content" }, 400);
    }
    const content = (m as { content?: unknown }).content;
    // Image calls send content as an array of parts, text calls send a string.
    totalChars += typeof content === "string"
      ? content.length
      : JSON.stringify(content ?? "").length;
  }
  if (totalChars > MAX_CHARS) return json({ error: "Payload too large" }, 413);

  const model = typeof payload.model === "string" ? payload.model : DEFAULT_MODEL;
  if (!ALLOWED_MODELS.has(model)) {
    return json({ error: `Model not allowed: ${model}` }, 400);
  }

  const stream = payload.stream === true;
  const temperature = typeof payload.temperature === "number"
    ? Math.min(Math.max(payload.temperature, 0), 2)
    : 0.7;
  const maxTokens = typeof payload.max_tokens === "number"
    ? Math.min(Math.max(Math.trunc(payload.max_tokens), 1), MAX_TOKENS_CAP)
    : 1024;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream,
  };
  // Image generation needs this passthrough; everything else ignores it.
  if (Array.isArray(payload.modalities)) body.modalities = payload.modalities;

  let upstream: Response;
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://shama.ly",
        "X-Title": "Shama Perfumes",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("ai-proxy: upstream fetch failed", e);
    return json({ error: "Upstream request failed" }, 502);
  }

  if (!upstream.ok) {
    const detail = await upstream.text();
    // Logged in full, returned trimmed: upstream errors can echo request
    // details, and this response goes to the browser.
    console.error("ai-proxy: OpenRouter error", upstream.status, detail);
    return json({ error: "Upstream error" }, upstream.status);
  }

  // Stream mode: hand the SSE body straight through so the chatbot keeps
  // rendering token by token.
  if (stream && upstream.body) {
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  return new Response(await upstream.text(), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
