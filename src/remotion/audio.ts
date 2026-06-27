/**
 * ===========================================================================
 * الملف: audio.ts
 * الدور: إعداد الأصول الصوتية (configuration).
 * يوفّر دوال لبناء مسارات ملفات الصوت الثابتة (التعليق لكل مشهد + الموسيقى
 * الخلفية) عبر staticFile، ويحدّد مستويات الصوت النسبية بين الموسيقى والتعليق.
 * ===========================================================================
 */
import { staticFile } from "remotion";
import type { Lang } from "./i18n";

// مفاتيح المشاهد الممكنة التي قد يوجد لها ملف صوتي.
export type SceneKey = "problem" | "solution" | "ai" | "quiz" | "product" | "delivery" | "cta";

/** يبني مسار ملف التعليق الصوتي لمشهد معيّن حسب اللغة (مثل: audio/ar/problem.mp3). */
export const sceneAudio = (scene: SceneKey, lang: Lang): string =>
  staticFile(`video-assets/audio/${lang}/${scene}.mp3`);

/** يبني مسار ملف الموسيقى الخلفية المشتركة لكل الفيديو. */
export const backgroundMusic = (): string =>
  staticFile("video-assets/audio/background.mp3");

// المعيار المتّبع في فيديوهات التسويق الصوتية: الموسيقى أخفض من الصوت بنحو 22 ديسيبل.
// تعليق بذروة 0.95 وموسيقى عند 0.05 ≈ فارق -25 ديسيبل: خافت بما يكفي ليلا ينافس
// السرد، وحاضر بما يكفي ليُحَسّ كطبقة صوتية حقيقية.
// Industry standard for voice-driven marketing video: music ~22 dB under voice.
// 0.95 voiceover at peak, music at 0.05 ≈ -25 dB delta. Quiet enough to never
// fight the narration, present enough to feel like a real bed.
export const BACKGROUND_VOLUME = 0.05; // مستوى صوت الموسيقى الخلفية
export const VOICEOVER_VOLUME = 0.95; // مستوى صوت التعليق الصوتي
