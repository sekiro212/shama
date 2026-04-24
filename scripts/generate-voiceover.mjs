#!/usr/bin/env node
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const envPath = resolve(ROOT, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error("Missing ELEVENLABS_API_KEY in env or .env.local");
  process.exit(1);
}

// Voice picks (override with VOICE_EN / VOICE_AR env vars to swap).
//
// EN — Brian (nPczCjzI2devNBz1zQrb): deep, middle-aged American, narration + ads.
//   Alts: Bill (pqHfZKP75CvOlQylNhV4) documentary | Adam (pNInz6obpgDQGcFmaJgB) deep narrator
//
// AR — Default uses Brian (premade, free tier). Multilingual v2 makes him speak Arabic;
//   accent will be American-tinted but works without a paid plan. For native Arabic
//   voices (Haytham, Arabic Knight, Marco Nady, Karim, Salim) you need ElevenLabs
//   Starter+ ($5/mo) since all native Arabic voices live in the community Voice Library.
//   Once upgraded, set VOICE_AR=IES4nrmZdUBHByLBde0P (Haytham - Conversation).
const VOICE_EN = process.env.VOICE_EN || "nPczCjzI2devNBz1zQrb"; // Brian
const VOICE_AR = process.env.VOICE_AR || "nPczCjzI2devNBz1zQrb"; // Brian (free) — swap when paid
const MODEL = "eleven_multilingual_v2";

// Per-scene narration. Lengths tuned to scene durations.
const SCRIPT = {
  en: {
    problem:  "Buying perfume blind? Five hundred dinars. One guess. No returns.",
    solution: "Try first. From three milliliters.",
    ai:       "Just type what you want. Our AI finds it on Shama.",
    quiz:     "Take the quiz. Get your scent.",
    product:  "Real perfumes. Fair prices. Every bottle has a sample.",
    delivery: "Vanex to your door. Twenty four to forty eight hours.",
    cta:      "Shama dot ly. Find your scent.",
  },
  ar: {
    problem:  "تشتري عطرك على العمياني؟ خمسمية دينار، تخمينة وحدة، بدون إرجاع.",
    solution: "جرّب الأول. من ثلاث ملي.",
    ai:       "اكتب اللي تبيه. الذكاء الاصطناعي يلقاه لك في شامة.",
    quiz:     "خذ الاختبار، واكتشف عطرك.",
    product:  "عطور حقيقية، أسعار عادلة، وكل قارورة عندها عيّنة.",
    delivery: "فانكس يوصّل لباب بيتك، خلال أربعة وعشرين إلى ثمانية وأربعين ساعة.",
    cta:      "شامة دوت إل واي. اكتشف عطرك.",
  },
};

// Voice settings tuned for premium marketing narration.
// stability: 0.5 = balanced (lower = more emotive but inconsistent)
// similarity_boost: 0.85 = preserve voice character without robotic over-fit
// style: 0.35 = some delivery expressiveness, not theatrical
// speaker_boost: clarity + presence for short ads
const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.85,
  style: 0.35,
  use_speaker_boost: true,
};

async function tts(lang, sceneKey, text) {
  const voiceId = lang === "ar" ? VOICE_AR : VOICE_EN;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": KEY,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: VOICE_SETTINGS,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs ${lang}/${sceneKey} HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const dir = resolve(ROOT, "public/video-assets/audio", lang);
  await mkdir(dir, { recursive: true });
  const out = resolve(dir, `${sceneKey}.mp3`);
  await writeFile(out, buf);
  return { out, bytes: buf.length };
}

async function main() {
  const onlyLang = process.argv[2];
  const onlyScene = process.argv[3];
  const langs = onlyLang ? [onlyLang] : ["en", "ar"];
  for (const lang of langs) {
    const scenes = onlyScene ? [onlyScene] : Object.keys(SCRIPT[lang]);
    for (const scene of scenes) {
      const text = SCRIPT[lang][scene];
      if (!text) continue;
      process.stdout.write(`[${lang}/${scene}] ... `);
      try {
        const { out, bytes } = await tts(lang, scene, text);
        console.log(`ok ${(bytes / 1024).toFixed(1)} KB → ${out.replace(ROOT + "/", "")}`);
      } catch (err) {
        console.log("FAIL");
        console.error(err.message);
        process.exit(1);
      }
    }
  }
}

main();
