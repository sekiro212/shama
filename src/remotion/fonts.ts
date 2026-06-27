/**
 * ===========================================================================
 * الملف: fonts.ts
 * الدور: إعداد الخطوط (configuration).
 * يحمّل خطوط جوجل اللازمة (لاتينية للإنجليزية وعربية للعربية) قبل بدء العرض،
 * ويؤجّل التصيير عبر delayRender حتى تكتمل، ثم يوفّر دالة لاختيار عائلة الخط
 * المناسبة للنصّ العادي والعناوين حسب لغة الفيديو.
 * ===========================================================================
 */
import { delayRender, continueRender } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexSansArabic";
import { loadFont as loadTajawal } from "@remotion/google-fonts/Tajawal";
import type { Lang } from "./i18n";

// تأجيل التصيير حتى تنتهي الخطوط من التحميل، وإلا ظهرت إطارات بخط بديل خاطئ.
const handle = delayRender("fonts");

// Inter: خط لاتيني للنصوص العادية في النسخة الإنجليزية.
const inter = loadInter("normal", {
  weights: ["300", "400", "600", "700"],
  subsets: ["latin"],
});

// Playfair Display: خط لاتيني للعناوين الفخمة في النسخة الإنجليزية.
const playfair = loadPlayfair("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

// IBM Plex Sans Arabic: خط عربي للنصوص العادية في النسخة العربية.
const plex = loadPlex("normal", {
  weights: ["300", "400", "600", "700"],
  subsets: ["arabic"],
});

// Tajawal: خط عربي للعناوين في النسخة العربية.
const tajawal = loadTajawal("normal", {
  weights: ["500", "800"],
  subsets: ["arabic"],
});

// بعد تحميل كل الخطوط نستأنف التصيير عبر continueRender (سواء نجح التحميل أو فشل).
Promise.all([
  inter.waitUntilDone(),
  playfair.waitUntilDone(),
  plex.waitUntilDone(),
  tajawal.waitUntilDone(),
])
  .then(() => continueRender(handle))
  .catch(() => continueRender(handle));

// خطوط احتياطية تُضاف بعد الخط الأساسي لو تعذّر تحميله من جوجل.
const ARABIC_FALLBACK = `, "Geeza Pro", "Damascus", "Arial", sans-serif`;
const LATIN_FALLBACK = `, "Helvetica Neue", "Helvetica", Arial, sans-serif`;

/** يعيد عائلتي الخط (body للنص و display للعناوين) المناسبتين للّغة المطلوبة. */
export const getFonts = (lang: Lang) => {
  // في العربية: Plex للنص و Tajawal للعناوين، مع البدائل العربية.
  if (lang === "ar") {
    return {
      body: `${plex.fontFamily}${ARABIC_FALLBACK}`,
      display: `${tajawal.fontFamily}${ARABIC_FALLBACK}`,
    };
  }
  // في الإنجليزية: Inter للنص و Playfair للعناوين، مع البدائل اللاتينية.
  return {
    body: `${inter.fontFamily}${LATIN_FALLBACK}`,
    display: `${playfair.fontFamily}${LATIN_FALLBACK}`,
  };
};
