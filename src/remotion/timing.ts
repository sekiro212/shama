/**
 * ===========================================================================
 * الملف: timing.ts
 * الدور: إعداد التوقيت (configuration) والمصدر الموحّد لكل أرقام التزامن.
 * يحدّد معدّل الإطارات، ومدّة كل مشهد، ومقدار تداخل الانتقالات، ويحسب تلقائياً
 * إطار بداية كل مشهد والمدّة الكلية وإطارات بدء التعليق الصوتي وميزانيته.
 * أي تعديل على التوقيت يجب أن يتمّ هنا فقط لضمان تطابق الصورة مع الصوت.
 * ===========================================================================
 */
// Single source of truth for video timing.
//
// The video is a TransitionSeries of 6 scenes. Scene visual durations are listed
// in SCENE_DURATIONS. Adjacent scenes overlap by TRANSITION_FRAMES (the cross-fade),
// so the total timeline is SUM(durations) - (n-1) * TRANSITION_FRAMES.
//
// Voiceover is DECOUPLED from the visual TransitionSeries: each scene's VO plays as
// an absolutely-positioned <Audio> on the main timeline (see Video.tsx), starting at
// the scene's absolute start frame + AUDIO_LEAD_IN. Because consecutive scene starts
// are (duration - transition) apart, VO clips never overlap as long as each clip is
// shorter than that gap minus the lead-in. VO_BUDGET_SECONDS encodes those budgets and
// is mirrored by the TARGET map in scripts/generate-voiceover-openrouter.mjs.

// عدد الإطارات في الثانية لكل الفيديو.
export const FPS = 30;

// مقدار التلاشي المتبادل بين المشهدين (بالإطارات)؛ يظهر المشهدان معاً خلاله.
// Cross-fade between scenes (frames). Adjacent scenes play simultaneously for this long.
export const TRANSITION_FRAMES = 12;

// عدد الإطارات التي ينتظرها التعليق الصوتي بعد بداية المشهد البصري، كي يبدأ بعد
// استقرار التلاشي وبدء قراءة العنوان.
// Frames a scene's voiceover waits after the scene's visual start, so it lands after
// the cross-fade settles and the headline begins to read.
export const AUDIO_LEAD_IN = 8;

// مفاتيح المشاهد الستة بترتيب ظهورها.
export type SceneKey =
  | "problem"
  | "solution"
  | "ai"
  | "product"
  | "delivery"
  | "cta";

// ترتيب المشاهد في المونتاج النهائي. (مشهد الاختبار محذوف عمداً لتكراره مع البحث الذكي.)
// Scene order in the cut. (Quiz is intentionally dropped — redundant with AI Finder.)
export const SCENE_ORDER: SceneKey[] = [
  "problem",
  "solution",
  "ai",
  "product",
  "delivery",
  "cta",
];

// المدّة البصرية لكل مشهد بالإطارات (التعليق بالثواني موضّح في الهامش).
// Visual duration of each scene, in frames.
export const SCENE_DURATIONS: Record<SceneKey, number> = {
  problem:  126, // 4.2s — hook
  solution: 114, // 3.8s
  ai:       132, // 4.4s
  product:  144, // 4.8s
  delivery: 114, // 3.8s
  cta:      132, // 4.4s
};

// إطار البداية المطلق لكل مشهد على الخط الزمني النهائي (بعد احتساب التداخل).
// المشهد الأول يبدأ من 0، وكل مشهد لاحق يبدأ = بداية السابق + مدّته - إطارات الانتقال.
// Absolute start frame of each scene on the final (overlapped) timeline.
// start[0] = 0; start[i] = start[i-1] + duration[i-1] - TRANSITION_FRAMES.
export const SCENE_START: Record<SceneKey, number> = (() => {
  const out = {} as Record<SceneKey, number>;
  let cursor = 0;
  SCENE_ORDER.forEach((key, i) => {
    out[key] = cursor;
    // نطرح إطارات الانتقال من كل مشهد عدا الأخير لأنه لا يتداخل مع تالٍ.
    cursor += SCENE_DURATIONS[key] - (i < SCENE_ORDER.length - 1 ? TRANSITION_FRAMES : 0);
  });
  return out;
})();

// الطول الكلي للخط الزمني = بداية آخر مشهد + مدّته الكاملة.
// Total timeline length = last scene start + its full duration.
export const TOTAL_FRAMES = (() => {
  const last = SCENE_ORDER[SCENE_ORDER.length - 1];
  return SCENE_START[last] + SCENE_DURATIONS[last];
})();

// الإطار المطلق الذي يبدأ عنده التعليق الصوتي لكل مشهد = بدايته البصرية + مهلة الدخول.
// Absolute frame at which each scene's voiceover should start.
export const AUDIO_START: Record<SceneKey, number> = (() => {
  const out = {} as Record<SceneKey, number>;
  SCENE_ORDER.forEach((key) => {
    out[key] = SCENE_START[key] + AUDIO_LEAD_IN;
  });
  return out;
})();

// ميزانية التعليق لكل مشهد (بالثواني): النافذة المسموعة قبل بدء تعليق المشهد التالي
// Per-scene voiceover budget (seconds): the audible window before the next scene's VO
// starts (or the timeline ends). Keep generated VO comfortably under these. Mirrored by
// TARGET in scripts/generate-voiceover-openrouter.mjs.
export const VO_BUDGET_SECONDS: Record<SceneKey, number> = (() => {
  const out = {} as Record<SceneKey, number>;
  SCENE_ORDER.forEach((key, i) => {
    const next = SCENE_ORDER[i + 1];
    // الفجوة = الفرق بين بداية تعليق هذا المشهد وبداية التالي، أو حتى نهاية الفيديو للأخير.
    const gapFrames = next
      ? AUDIO_START[next] - AUDIO_START[key]
      : TOTAL_FRAMES - AUDIO_START[key];
    out[key] = +(gapFrames / FPS).toFixed(2); // تحويل الإطارات إلى ثوانٍ بخانتين عشريتين
  });
  return out;
})();

// مدّة كل مشهد بالثواني (مشتقّة من الإطارات / FPS) لأغراض العرض والحساب.
export const SCENE_SECONDS: Record<SceneKey, number> = (() => {
  const out = {} as Record<SceneKey, number>;
  SCENE_ORDER.forEach((key) => {
    out[key] = SCENE_DURATIONS[key] / FPS;
  });
  return out;
})();
