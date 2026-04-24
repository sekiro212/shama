import { staticFile } from "remotion";
import type { Lang } from "./i18n";

export type SceneKey = "problem" | "solution" | "ai" | "quiz" | "product" | "delivery" | "cta";

export const sceneAudio = (scene: SceneKey, lang: Lang): string =>
  staticFile(`video-assets/audio/${lang}/${scene}.mp3`);

export const backgroundMusic = (): string =>
  staticFile("video-assets/audio/background.mp3");

// Industry standard for voice-driven marketing video: music ~22 dB under voice.
// 0.95 voiceover at peak, music at 0.05 ≈ -25 dB delta. Quiet enough to never
// fight the narration, present enough to feel like a real bed.
export const BACKGROUND_VOLUME = 0.05;
export const VOICEOVER_VOLUME = 0.95;
