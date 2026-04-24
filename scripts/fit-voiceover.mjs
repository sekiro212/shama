#!/usr/bin/env node
// Time-fit each voiceover mp3 to its scene duration using ffmpeg atempo.
// Targets 95% of scene duration so the line finishes ~0.15s before the cut,
// giving the music bed and visual a breath before the next scene.
//
// Usage:
//   node scripts/fit-voiceover.mjs

import { execFileSync } from "node:child_process";
import { renameSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Scene durations in seconds (from Video.tsx SCENES map / 30 fps).
const SCENE_SECONDS = {
  problem:  3.0,
  solution: 3.0,
  ai:       5.0,
  quiz:     4.0,
  product:  5.0,
  delivery: 3.0,
  cta:      5.0,
};
const HEADROOM = 0.92; // leave ~8% breathing room

function probeDuration(file) {
  const out = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=nw=1:nk=1", file,
  ], { stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
  return Number(out);
}

// atempo only accepts 0.5 - 100 per filter; chain multiple if ratio > 2.
function atempoChain(ratio) {
  const filters = [];
  let r = ratio;
  while (r > 2.0) { filters.push("atempo=2.0"); r /= 2.0; }
  while (r < 0.5) { filters.push("atempo=0.5"); r /= 0.5; }
  filters.push(`atempo=${r.toFixed(4)}`);
  return filters.join(",");
}

function fit(file, targetDur) {
  const cur = probeDuration(file);
  const ratio = cur / targetDur;
  if (ratio <= 1.02 && ratio >= 0.85) {
    // Close enough, skip
    return { cur, ratio, action: "skip" };
  }
  const tmp = file + ".tmp.mp3";
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-i", file,
    "-filter:a", atempoChain(ratio),
    "-codec:a", "libmp3lame", "-q:a", "2",
    tmp,
  ], { stdio: "pipe" });
  renameSync(tmp, file);
  return { cur, ratio, action: ratio > 1 ? "speed-up" : "slow-down" };
}

const langs = ["en", "ar"];
for (const lang of langs) {
  console.log(`\n${lang.toUpperCase()}`);
  for (const [scene, sceneDur] of Object.entries(SCENE_SECONDS)) {
    const file = resolve(ROOT, "public/video-assets/audio", lang, `${scene}.mp3`);
    if (!existsSync(file)) {
      console.log(`  ${scene.padEnd(10)} (missing)`);
      continue;
    }
    const target = sceneDur * HEADROOM;
    const r = fit(file, target);
    const final = probeDuration(file);
    console.log(
      `  ${scene.padEnd(10)} was ${r.cur.toFixed(2)}s → target ${target.toFixed(2)}s ` +
      `(${r.ratio.toFixed(2)}x ${r.action}) → ${final.toFixed(2)}s`
    );
  }
}
