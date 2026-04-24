import { delayRender, continueRender } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexSansArabic";
import { loadFont as loadTajawal } from "@remotion/google-fonts/Tajawal";
import type { Lang } from "./i18n";

const handle = delayRender("fonts");

const inter = loadInter("normal", {
  weights: ["300", "400", "600", "700"],
  subsets: ["latin"],
});

const playfair = loadPlayfair("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

const plex = loadPlex("normal", {
  weights: ["300", "400", "600", "700"],
  subsets: ["arabic"],
});

const tajawal = loadTajawal("normal", {
  weights: ["500", "800"],
  subsets: ["arabic"],
});

Promise.all([
  inter.waitUntilDone(),
  playfair.waitUntilDone(),
  plex.waitUntilDone(),
  tajawal.waitUntilDone(),
])
  .then(() => continueRender(handle))
  .catch(() => continueRender(handle));

const ARABIC_FALLBACK = `, "Geeza Pro", "Damascus", "Arial", sans-serif`;
const LATIN_FALLBACK = `, "Helvetica Neue", "Helvetica", Arial, sans-serif`;

export const getFonts = (lang: Lang) => {
  if (lang === "ar") {
    return {
      body: `${plex.fontFamily}${ARABIC_FALLBACK}`,
      display: `${tajawal.fontFamily}${ARABIC_FALLBACK}`,
    };
  }
  return {
    body: `${inter.fontFamily}${LATIN_FALLBACK}`,
    display: `${playfair.fontFamily}${LATIN_FALLBACK}`,
  };
};
