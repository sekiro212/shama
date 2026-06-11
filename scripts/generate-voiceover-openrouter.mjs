#!/usr/bin/env node
// Voiceover via OpenRouter → openai/gpt-audio.
// Best built-in voices: marin and cedar (highest quality, multilingual).
// We use a system-prompt narrator brief so each line gets warm, marketing-grade delivery.
//
// Usage:
//   node scripts/generate-voiceover-openrouter.mjs           # both languages, all scenes
//   node scripts/generate-voiceover-openrouter.mjs en        # English only
//   node scripts/generate-voiceover-openrouter.mjs ar problem
//
// Override voice with VOICE_EN / VOICE_AR env vars.

import { writeFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, streamAudio } from "./_openrouter.mjs";

const MODEL = "openai/gpt-audio";
const VOICE_EN = process.env.VOICE_EN || "marin";
const VOICE_AR = process.env.VOICE_AR || "marin";

// Per-scene target durations (seconds) — keep voiceover under these.
// Mirrors VO_BUDGET_SECONDS in src/remotion/timing.ts, held ~0.4s under each
// budget so the natural VO length fits without atempo time-stretching.
const TARGET = {
  problem:  3.4,
  solution: 3.0,
  ai:       3.6,
  product:  4.0,
  delivery: 3.0,
  cta:      3.6,
};

const SYSTEM_EN =
  "You are a premium perfume TV commercial narrator. " +
  "READ ONLY the user's exact line — never add greetings, intros, summaries, or extra words of any kind. " +
  "Delivery: confident, warm, intimate, with measured but BRISK pacing — like a polished 30-second luxury fragrance ad. " +
  "Never linger on syllables. Never slow down. Keep momentum end-to-end.";

const SYSTEM_AR =
  "أنت معلّق صوتي محترف لإعلان تجاري لعطر فاخر، تتكلم باللهجة الليبية الواضحة. " +
  "انطق فقط نصّ المستخدم بالضبط، بدون أي مقدمة أو تعليق أو إضافة. " +
  "الأداء: نبرة دافئة، حميمة، واثقة، بإيقاع سريع ومتوازن مثل إعلان تلفزيوني فاخر مدته ثلاثون ثانية. " +
  "لا تبطّئ الكلمات، ولا تطيل، ولا تتكلم بنبرة درامية. الإيقاع متواصل من البداية للنهاية.";

// NOTE: these spoken lines must stay consistent with the on-screen text in
// src/remotion/i18n.ts (separate asset). Quiz is dropped from the cut.
const SCRIPT = {
  en: {
    problem:  "Buying perfume blind? Five hundred dinars, gone.",
    solution: "Try first. Samples from three milliliters.",
    ai:       "Type what you want. We find it.",
    product:  "Real perfumes. Fair prices. A sample in every bottle.",
    delivery: "Vanex to your door, in two days.",
    cta:      "Shama dot ly. Find your scent.",
  },
  ar: {
    problem:  "تشتري عطرك على العمياني؟ خمسمية دينار راحت.",
    solution: "جرّب الأول. عيّنات من ثلاث ملي.",
    ai:       "اكتب اللي تبي. ونلقاه لك.",
    product:  "عطور حقيقية، أسعار عادلة. وكل قارورة معاها عيّنة.",
    delivery: "فانكس لباب بيتك، خلال يومين.",
    cta:      "شامة دوت إل واي. اكتشف عطرك.",
  },
};

// gpt-audio streams PCM16 only (24 kHz, mono, signed LE). We capture the raw
// PCM bytes, then transcode to MP3 with ffmpeg so Remotion's <Audio> component
// can play them.
async function tts(lang, scene, text) {
  const voice = lang === "ar" ? VOICE_AR : VOICE_EN;
  const system = lang === "ar" ? SYSTEM_AR : SYSTEM_EN;
  const target = TARGET[scene] ?? 4.0;
  // Wrap user content with a one-off pacing reminder so each scene has its own budget
  const wrapped = lang === "ar"
    ? `[انطق هذا السطر بالضبط بسرعة طبيعية وواثقة، يجب أن ينتهي خلال ${target} ثوانٍ]\n${text}`
    : `[Read this exact line at confident natural pace; finish within ${target} seconds]\n${text}`;
  const { buffer } = await streamAudio({
    model: MODEL,
    body: {
      modalities: ["text", "audio"],
      audio: { voice, format: "pcm16" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: wrapped },
      ],
    },
  });
  const dir = resolve(ROOT, "public/video-assets/audio", lang);
  await mkdir(dir, { recursive: true });
  const pcm = resolve(dir, `${scene}.pcm`);
  const out = resolve(dir, `${scene}.mp3`);
  await writeFile(pcm, buffer);
  // Transcode raw PCM16 (24kHz, mono, little-endian) → MP3 V2 quality.
  execFileSync(
    "ffmpeg",
    [
      "-y", "-loglevel", "error",
      "-f", "s16le", "-ar", "24000", "-ac", "1",
      "-i", pcm,
      "-codec:a", "libmp3lame", "-q:a", "2",
      out,
    ],
    { stdio: "pipe" }
  );
  await rm(pcm);
  return { out, bytes: buffer.length };
}

const onlyLang = process.argv[2];
const onlyScene = process.argv[3];
const langs = onlyLang ? [onlyLang] : ["en", "ar"];
for (const lang of langs) {
  const scenes = onlyScene ? [onlyScene] : Object.keys(SCRIPT[lang]);
  for (const scene of scenes) {
    const text = SCRIPT[lang][scene];
    if (!text) continue;
    const voice = lang === "ar" ? VOICE_AR : VOICE_EN;
    process.stdout.write(`[${lang}/${scene}] ${MODEL}/${voice} ... `);
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
