// Shared OpenRouter helpers: env loading + SSE audio streaming.
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, "..");

export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = resolve(ROOT, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}

export function openrouterKey() {
  loadEnv();
  const key =
    process.env.OPENROUTER_API_KEY ||
    process.env.VITE_OPENROUTER_API_KEY;
  if (!key) {
    console.error("Missing OPENROUTER_API_KEY (or VITE_OPENROUTER_API_KEY) in env or .env.local / .env");
    process.exit(1);
  }
  return key;
}

// POST a chat completion to OpenRouter, request audio output via SSE,
// accumulate base64 audio chunks across the stream, and return the decoded Buffer.
//
// Handles multiple response shapes since music vs TTS models differ:
//   - delta.audio.data (gpt-audio standard)
//   - message.audio.data (final-chunk model)
//   - delta.content[N].input_audio.data or delta.content[N].audio.data
export async function streamAudio({ model, body, headers = {} }) {
  const key = openrouterKey();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://shama.ly",
      "X-Title": "Shama Marketing Video",
      ...headers,
    },
    body: JSON.stringify({ model, ...body, stream: true }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenRouter ${model} HTTP ${res.status}: ${txt.slice(0, 600)}`);
  }
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const chunks = [];
  let buffer = "";
  let textOut = "";
  let format = null;

  const collectAudio = (obj) => {
    if (!obj || typeof obj !== "object") return;
    // Common shapes
    const a1 = obj?.audio?.data;
    if (typeof a1 === "string" && a1.length > 0) chunks.push(a1);
    if (obj?.audio?.format && !format) format = obj.audio.format;
    // Content array shape
    const content = obj?.content;
    if (Array.isArray(content)) {
      for (const c of content) {
        const a2 = c?.audio?.data || c?.input_audio?.data;
        if (typeof a2 === "string" && a2.length > 0) chunks.push(a2);
        if ((c?.audio?.format || c?.input_audio?.format) && !format) {
          format = c?.audio?.format || c?.input_audio?.format;
        }
      }
    }
    if (typeof obj?.text === "string") textOut += obj.text;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const raw of parts) {
      const line = raw.trim();
      if (!line || !line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      let parsed;
      try { parsed = JSON.parse(data); } catch { continue; }
      const choice = parsed?.choices?.[0];
      if (!choice) continue;
      collectAudio(choice.delta);
      collectAudio(choice.message);
    }
  }

  if (chunks.length === 0) {
    throw new Error(`No audio data in response for ${model}. Last text: ${textOut.slice(0, 200)}`);
  }

  return { buffer: Buffer.from(chunks.join(""), "base64"), format, transcript: textOut };
}
