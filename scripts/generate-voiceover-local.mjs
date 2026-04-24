#!/usr/bin/env node
// Fallback voiceover generator using macOS built-in `say` + `lame`.
// Use this when ElevenLabs is blocked. Voice quality < ElevenLabs but ships now.
// Requires: macOS, /usr/bin/say, lame (brew install lame).

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const VOICE_EN = "Samantha";
const VOICE_AR = "Majed";

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

function ensure(cmd) {
  const r = spawnSync("which", [cmd]);
  if (r.status !== 0) {
    console.error(`Missing required tool: ${cmd}`);
    process.exit(1);
  }
}
ensure("say");
ensure("lame");

function generate(lang, scene, text) {
  const voice = lang === "ar" ? VOICE_AR : VOICE_EN;
  const dir = resolve(ROOT, "public/video-assets/audio", lang);
  mkdirSync(dir, { recursive: true });
  const aiff = resolve(dir, `${scene}.aiff`);
  const mp3 = resolve(dir, `${scene}.mp3`);
  // Slower rate for marketing clarity (default 175wpm; using 165 for English, 145 for Arabic)
  const rate = lang === "ar" ? "145" : "165";
  execFileSync("say", ["-v", voice, "-r", rate, "-o", aiff, text], { stdio: "pipe" });
  execFileSync("lame", ["--quiet", "-V", "4", "--resample", "44.1", aiff, mp3], { stdio: "pipe" });
  rmSync(aiff);
  return mp3;
}

const onlyLang = process.argv[2];
const onlyScene = process.argv[3];
const langs = onlyLang ? [onlyLang] : ["en", "ar"];
for (const lang of langs) {
  const scenes = onlyScene ? [onlyScene] : Object.keys(SCRIPT[lang]);
  for (const scene of scenes) {
    const text = SCRIPT[lang][scene];
    if (!text) continue;
    process.stdout.write(`[${lang}/${scene}] ${VOICE_AR && lang === "ar" ? VOICE_AR : VOICE_EN} ... `);
    try {
      const mp3 = generate(lang, scene, text);
      const exists = existsSync(mp3);
      console.log(exists ? `ok → ${mp3.replace(ROOT + "/", "")}` : "FAIL (no file)");
    } catch (err) {
      console.log("FAIL");
      console.error(err.message);
      process.exit(1);
    }
  }
}
