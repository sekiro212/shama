#!/usr/bin/env node
/**
 * Send a post caption to Telegram as plain text, so it can be copied straight
 * into Instagram from the phone.
 *
 *   node scripts/ig-post/send-caption.cjs caption.txt
 *   node scripts/ig-post/send-caption.cjs < caption.txt
 *
 * Captions ship with every character/product post. Sending them as a separate
 * message (not as a photo caption) matters: Telegram photo captions cap at
 * 1024 characters and cannot be copied cleanly on mobile, while a plain message
 * is tap-and-hold copyable in full.
 *
 * Reads TELEGRAM_BOT_TOKEN + ADMIN_CHAT_IDS from telegram-bot/.env.
 */
const fs = require("fs");
const path = require("path");

const ENV = path.join(__dirname, "..", "..", "telegram-bot", ".env");
const TELEGRAM_MAX = 4096;

function readEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

const readStdin = () =>
  new Promise((resolve) => {
    let d = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (d += c));
    process.stdin.on("end", () => resolve(d));
  });

/** Split on blank lines so a long caption never breaks mid-sentence. */
function chunk(text) {
  if (text.length <= TELEGRAM_MAX) return [text];
  const parts = [];
  let cur = "";
  for (const block of text.split(/\n\n/)) {
    if ((cur + "\n\n" + block).length > TELEGRAM_MAX && cur) {
      parts.push(cur);
      cur = block;
    } else {
      cur = cur ? `${cur}\n\n${block}` : block;
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

async function main() {
  const env = readEnv(ENV);
  const token = env.TELEGRAM_BOT_TOKEN;
  const chat = env.ADMIN_CHAT_IDS.split(",")[0].trim();
  if (!token || !chat) throw new Error("missing TELEGRAM_BOT_TOKEN / ADMIN_CHAT_IDS");

  const file = process.argv[2];
  const text = file ? fs.readFileSync(file, "utf8") : await readStdin();
  if (!text.trim()) throw new Error("nothing to send");

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const parts = chunk(text.trimEnd());

  for (const [i, part] of parts.entries()) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: part,
        // no parse_mode: captions carry #hashtags, «guillemets» and underscores
        // that Markdown would swallow or reject outright
        disable_web_page_preview: true,
      }),
    });
    const json = await res.json();
    const label = parts.length > 1 ? `part ${i + 1}/${parts.length}` : "caption";
    console.log(json.ok ? `OK   ${label}` : `FAIL ${label}: ${json.description}`);
    if (parts.length > 1) await new Promise((r) => setTimeout(r, 800));
  }
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
