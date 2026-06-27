/**
 * ===========================================================================
 * الملف: SceneBackdrop.tsx
 * الدور: مكوّن متحرّك (animated component) للخلفية السينمائية المشتركة بين المشاهد.
 * يرسم قاعدة شبه سوداء مع توهّجين شعاعيين ينجرفان ببطء (أزرق العلامة + ذهبي)،
 * وتظليلاً محيطياً (vignette) ناعماً، وطبقة حُبيبات فيلمية ثابتة؛ ليبدو كل مشهد
 * حيّاً بدل السواد المسطّح.
 * ===========================================================================
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";

// خصائص المكوّن.
type Props = {
  primaryColor: string;
  goldColor: string;
  // بذرة خاصة بكل مشهد ليقع التوهّج في موضع مختلف قليلاً عن غيره.
  seed?: number;
  // قوّة التوهّج الكلّية (0–1). مشهدا الافتتاح والدعوة قد يكونان أشدّ.
  intensity?: number;
};

// خلفية سينمائية مشتركة: قاعدة شبه سوداء مع توهّجين شعاعيين ينجرفان ببطء
// (أزرق العلامة + ذهبي)، وتظليل محيطي ناعم، وطبقة حُبيبات فيلمية ثابتة.
// تحلّ محلّ اللون #0A0A0A المسطّح كي لا يبدو أي مشهد أسود ميّتاً.
// Shared cinematic backdrop: a near-black base with two slowly drifting radial
// glows (brand blue + gold), a soft vignette, and a static film-grain layer.
// Replaces the flat #0A0A0A so no scene ever reads as dead black.
/** يرسم طبقات الخلفية السينمائية الكاملة المالئة للشاشة. */
export const SceneBackdrop: React.FC<Props> = ({
  primaryColor,
  goldColor,
  seed = 0,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();

  // انجراف عضوي بطيء جداً (دورة كاملة ~12 ثانية) ليبدو الضوء حيّاً لكن هادئاً.
  // t زمن طبيعي مقسوم على 360 إطاراً (دورة كاملة)، يُغذّي دوال جيب/جيب تمام
  // لتحريك مركزي التوهّجين في مسار دائري؛ والبذرة seed تزيح طور كل مشهد.
  // Very slow organic drift (full cycle ~12s) so the light feels alive but calm.
  const t = frame / 360;
  const blueX = 30 + Math.sin(t * Math.PI * 2 + seed) * 12; // موقع التوهّج الأزرق أفقياً
  const blueY = 28 + Math.cos(t * Math.PI * 2 + seed * 1.3) * 10; // وموقعه رأسياً
  const goldX = 72 + Math.cos(t * Math.PI * 2 + seed * 0.7) * 12; // موقع التوهّج الذهبي أفقياً
  const goldY = 74 + Math.sin(t * Math.PI * 2 + seed * 1.7) * 10; // وموقعه رأسياً

  // شفافية كل توهّج متناسبة مع شدّة الإضاءة، مُحوّلة لاحقاً إلى صيغة سداسية عشرية.
  const blueA = (0.22 * intensity).toFixed(3);
  const goldA = (0.16 * intensity).toFixed(3);

  return (
    <AbsoluteFill style={{ backgroundColor: "#080809" }}>
      {/* توهّج أزرق العلامة المنجرف */}
      {/* Drifting brand-blue glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 50% at ${blueX}% ${blueY}%, ${primaryColor}${alpha(blueA)} 0%, transparent 70%)`,
        }}
      />
      {/* توهّج ذهبي منجرف */}
      {/* Drifting gold glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(55% 45% at ${goldX}% ${goldY}%, ${goldColor}${alpha(goldA)} 0%, transparent 68%)`,
        }}
      />
      {/* تظليل محيطي ناعم لتركيز النظر على المنتصف */}
      {/* Soft vignette to focus the center */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {/* طبقة حُبيبات فيلمية ثابتة */}
      {/* Static film grain */}
      <AbsoluteFill
        style={{
          opacity: 0.06,
          mixBlendMode: "overlay",
          backgroundImage: GRAIN_URL,
          backgroundSize: "180px 180px",
        }}
      />
    </AbsoluteFill>
  );
};

/** يحوّل شفافية نصّية (0–1) إلى لاحقة سداسية عشرية من خانتين لتُلحَق بـ #RRGGBB. */
// Convert a 0–1 decimal-string alpha into a 2-digit hex suffix for #RRGGBB + AA.
function alpha(a: string): string {
  // ضبط القيمة بين 0 و1، ثم ضربها في 255 وتحويلها إلى سداسي عشري بخانتين.
  const n = Math.round(Math.min(1, Math.max(0, parseFloat(a))) * 255);
  return n.toString(16).padStart(2, "0");
}

// ضوضاء كسورية (fractal noise) بصيغة SVG مضمّنة محوّلة إلى data URL. حتمية ولا
// تحتاج جلب أي ملف خارجي، وتُستخدم لطبقة الحُبيبات الفيلمية.
// Inline SVG fractal noise → data URL. Deterministic, no asset fetch.
const GRAIN_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">` +
  `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>` +
  `<feColorMatrix type="saturate" values="0"/></filter>` +
  `<rect width="100%" height="100%" filter="url(#n)"/></svg>`;

const GRAIN_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(GRAIN_SVG)}")`;
