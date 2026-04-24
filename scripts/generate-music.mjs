#!/usr/bin/env node
// Background music via OpenRouter → google/lyria-3-clip-preview ($0.04 per 30s clip).
// Generates a single instrumental bed used under all scenes at low volume.
//
// Prompt strategy follows the Lyria 3 prompt guide:
//   - Genre + era + instruments + BPM + key + mood + instrumental flag
//   - Low dynamic range so the bed sits behind voiceover
//
// Usage:
//   node scripts/generate-music.mjs                # single 30s background.mp3
//   node scripts/generate-music.mjs warm-cinematic # custom output basename
//   PROMPT="..." node scripts/generate-music.mjs   # custom prompt override

import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { ROOT, streamAudio } from "./_openrouter.mjs";

// Lyria 3 Pro = full-length songs (up to 3 min) at $0.08, higher quality than Clip.
const MODEL = process.env.MUSIC_MODEL || "google/lyria-3-pro-preview";

// Designed strictly as a BACKGROUND BED for voiceover-driven marketing video.
// Industry standard: low dynamic range, no busy elements, sits at -22 dBFS under voice.
const DEFAULT_PROMPT = [
  // Genre + role
  "An ultra-minimal instrumental ambient bed designed to play UNDER a voiceover in a luxury perfume commercial.",
  "Style: cinematic minimalism, slow contemplative ambient, NOT a featured score — purely a quiet underscore.",
  // Tempo + key
  "Slow tempo, around 65 BPM. Key: D minor. Length: at least 35 seconds.",
  // Instrumentation (sparse)
  "Single soft Fender Rhodes piano playing very sparse two-note phrases with long silences between them.",
  "Warm low cello drone underneath, almost imperceptible, providing harmonic foundation only.",
  "Hint of distant middle-eastern oud, played very softly, only on phrase endings.",
  "Subtle vinyl crackle texture for warmth. Soft tape hiss feel.",
  // Critical mix instructions
  "NO drums at all. NO percussion. NO bass guitar. NO synths. NO vocals or lyrics of any kind.",
  "Compressed, low dynamic range under 4 dB so it never spikes above voiceover.",
  "All energy in the LOW-MID frequency range; leave the 1-4 kHz vocal range completely empty.",
  "Mix sounds intentionally muffled and distant, like music heard through a wall.",
  // Arc
  "Stays at the same quiet intensity throughout, no buildups, no climaxes, no drops.",
  // Mood
  "Mood: candlelit, nocturnal, intimate, contemplative, warm, breathy, dreamy.",
].join(" ");

const PROMPT = process.env.PROMPT || DEFAULT_PROMPT;
const basename = process.argv[2] || "background";

async function generate() {
  const { buffer } = await streamAudio({
    model: MODEL,
    body: {
      modalities: ["text", "audio"],
      audio: { format: "mp3" },
      messages: [{ role: "user", content: PROMPT }],
    },
  });
  const dir = resolve(ROOT, "public/video-assets/audio");
  await mkdir(dir, { recursive: true });
  const out = resolve(dir, `${basename}.mp3`);
  await writeFile(out, buffer);
  return { out, bytes: buffer.length };
}

process.stdout.write(`[${MODEL}] generating ${basename}.mp3 ... `);
try {
  const { out, bytes } = await generate();
  console.log(`ok ${(bytes / 1024).toFixed(1)} KB → ${out.replace(ROOT + "/", "")}`);
  console.log("Cost: ~$0.04 per clip.");
} catch (err) {
  console.log("FAIL");
  console.error(err.message);
  process.exit(1);
}
