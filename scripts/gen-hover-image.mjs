// One-off: generate an Amouage-style "mood" hover image via OpenRouter (Gemini
// image preview), upload it to Supabase Storage, print the public URL + path.
// Usage: node scripts/gen-hover-image.mjs <perfumeId> <refImageUrl> "<prompt>"
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const OR_KEY = env.VITE_OPENROUTER_API_KEY;
const SB_URL = env.VITE_SUPABASE_URL;
const SB_ANON = env.VITE_SUPABASE_ANON_KEY;
if (!OR_KEY || !SB_URL || !SB_ANON) throw new Error("Missing env keys");

const [perfumeId, refUrl, prompt] = process.argv.slice(2);
if (!perfumeId || !prompt) throw new Error("Args: <perfumeId> <refImageUrl> <prompt>");

console.log("→ generating image via OpenRouter…");
const content = [{ type: "text", text: prompt }];
if (refUrl) content.push({ type: "image_url", image_url: { url: refUrl } });

const gen = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${OR_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://shama.ly",
    "X-Title": "Shama",
  },
  body: JSON.stringify({
    model: "google/gemini-3.1-flash-image-preview",
    modalities: ["text", "image"],
    messages: [{ role: "user", content }],
  }),
});
if (!gen.ok) throw new Error(`OpenRouter ${gen.status}: ${await gen.text()}`);
const data = await gen.json();
const msg = data?.choices?.[0]?.message;
const dataUrl =
  msg?.images?.[0]?.image_url?.url ||
  (Array.isArray(msg?.content)
    ? msg.content.find((p) => p.type === "image_url")?.image_url?.url
    : typeof msg?.content === "string" && msg.content.startsWith("data:image/")
      ? msg.content
      : null);
if (!dataUrl) throw new Error("No image in response: " + JSON.stringify(msg)?.slice(0, 400));

const m = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
if (!m) throw new Error("Unexpected image format");
const mime = m[1];
const ext = mime.split("/")[1].replace("jpeg", "jpg");
const bytes = Buffer.from(m[2], "base64");
console.log(`→ got ${mime}, ${(bytes.length / 1024).toFixed(0)} KB`);

const filePath = `${perfumeId}/hover-${Date.now()}.${ext}`;
console.log("→ uploading to Supabase storage…");
const up = await fetch(
  `${SB_URL}/storage/v1/object/perfume-images/${filePath}`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SB_ANON}`,
      apikey: SB_ANON,
      "Content-Type": mime,
      "x-upsert": "true",
      "cache-control": "3600",
    },
    body: bytes,
  }
);
if (!up.ok) throw new Error(`Storage upload ${up.status}: ${await up.text()}`);

const publicUrl = `${SB_URL}/storage/v1/object/public/perfume-images/${filePath}`;
console.log("\n✅ DONE");
console.log("PUBLIC_URL=" + publicUrl);
console.log("FILE_PATH=" + filePath);
console.log("IMAGE_NAME=" + filePath.split("/").pop());
