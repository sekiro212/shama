/**
 * ===========================================================================
 * الملف: theme.ts
 * الدور: التوقيت والألوان لريلز "البروفايل العطري".
 *
 * الريل قصير عمدًا: البحث يقول إنّ الخطّاف يجب أن يُمسك خلال ثلاث ثوانٍ،
 * وإنّ الاحتفاظ بالمشاهد هو ما يحدّد الوصول. لذا لا مقدّمة ولا شعار في
 * البداية — الوجه أوّلًا، والاسم بعده مباشرة.
 * ===========================================================================
 */

export const FPS = 30;

/** مدّة كل مقطع بالإطارات. المجموع هو طول الفيلم. */
export const BEATS = {
  hook: 75, // الوجه + السطر التمهيدي
  name: 60, // اسم الشخصية
  question: 75, // السؤال
  reveal: 105, // كشف القارورة
  notes: 75, // المكوّنات
  cta: 60, // الختام
} as const;

export type BeatKey = keyof typeof BEATS;

export const BEAT_ORDER: BeatKey[] = [
  "hook",
  "name",
  "question",
  "reveal",
  "notes",
  "cta",
];

/** بداية كل مقطع بالإطارات، محسوبة تراكميًّا. */
export const BEAT_START: Record<BeatKey, number> = (() => {
  let t = 0;
  const out = {} as Record<BeatKey, number>;
  for (const k of BEAT_ORDER) {
    out[k] = t;
    t += BEATS[k];
  }
  return out;
})();

export const TOTAL_FRAMES = BEAT_ORDER.reduce((n, k) => n + BEATS[k], 0);

/** لوحة الألوان تأتي من إعداد الشخصية، وهذه قيم احتياطية. */
export interface LorePalette {
  g0: string;
  g1: string;
  g2: string;
  ink: string;
  soft: string;
  acc: string;
}

export const FALLBACK_PALETTE: LorePalette = {
  g0: "#5c1220",
  g1: "#2a0a11",
  g2: "#120508",
  ink: "#f6e7ea",
  soft: "#c99aa4",
  acc: "#c84a5c",
};
