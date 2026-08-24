/**
 * ===========================================================================
 * الملف: ProductReel.tsx
 * الدور: ريلز عمودي 1080×1920 لعطرٍ واحد — القارورة هي البطل، والهرم
 *        العطري هو الحكاية.
 *
 * يختلف عن ريلز الشخصيات: هناك الوجه يمسك الانتباه، وهنا لا يوجد وجه. لذا
 * الخطّاف سطرٌ واحد جريء، ثم تُروى المكوّنات كرحلة — قمّة ثم قلب ثم قاعدة —
 * لأنّ هذا التسلسل هو ما يهتمّ به هواة العطور فعلًا.
 * ===========================================================================
 */
import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getFonts } from "../fonts";
import { LorePalette, FALLBACK_PALETTE } from "./theme";

export const P_FPS = 30;
/** مقاطع ريلز المنتج. أطول قليلًا من ريلز الشخصية لأنّ الهرم ثلاث طبقات. */
export const P_BEATS = {
  hook: 90,
  top: 84,
  heart: 84,
  base: 84,
  verdict: 84,
  cta: 66,
} as const;

export type PBeat = keyof typeof P_BEATS;
export const P_ORDER: PBeat[] = ["hook", "top", "heart", "base", "verdict", "cta"];
export const P_START: Record<PBeat, number> = (() => {
  let t = 0;
  const o = {} as Record<PBeat, number>;
  for (const k of P_ORDER) {
    o[k] = t;
    t += P_BEATS[k];
  }
  return o;
})();
export const P_TOTAL = P_ORDER.reduce((n, k) => n + P_BEATS[k], 0);

export interface ProductReelProps {
  language: "ar" | "en";
  bottleImage: string;
  hook: string;
  house: string;
  product: string;
  layers: { label: string; notes: string }[]; // القمّة / القلب / القاعدة
  verdict: string;
  price: string;
  size: string;
}

const asset = (p: string) => (p.startsWith("http") ? p : staticFile(p));

const useBeat = (start: number, len: number, fade = 9) => {
  const f = useCurrentFrame();
  const local = f - start;
  const a = interpolate(local, [0, fade], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const b = interpolate(local, [len - fade, len], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { local, opacity: Math.min(a, b), active: local >= 0 && local < len };
};

export const ProductReel: React.FC<ProductReelProps & { palette?: LorePalette }> = ({
  language,
  bottleImage,
  hook,
  house,
  product,
  layers,
  verdict,
  price,
  size,
  palette = FALLBACK_PALETTE,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);
  const rtl = language === "ar";
  const p = palette;

  const hookB = useBeat(P_START.hook, P_BEATS.hook);
  const ctaB = useBeat(P_START.cta, P_BEATS.cta);
  const verdictB = useBeat(P_START.verdict, P_BEATS.verdict);
  // مُحسوبة مسبقًا لا داخل map: قواعد الـ hooks تمنع استدعاءها في حلقة.
  const topB = useBeat(P_START.top, P_BEATS.top);
  const heartB = useBeat(P_START.heart, P_BEATS.heart);
  const baseB = useBeat(P_START.base, P_BEATS.base);
  const layerBeats = [topB, heartB, baseB];

  // القارورة تدخل كبيرة في المنتصف، ثم تنكمش وتصعد لتفسح المجال للمكوّنات،
  // فتبقى حاضرة في كل لقطة بدل أن تختفي بعد الثانية الثالثة.
  const shrink = interpolate(
    frame,
    [P_START.top - 14, P_START.top + 14],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const bottleW = interpolate(shrink, [0, 1], [760, 500]);
  const bottleY = interpolate(shrink, [0, 1], [0, -170]);
  const bottleIn = spring({ frame, fps, config: { damping: 200, mass: 0.8 } });
  // يغادر في مقطع الختام
  const bottleOut = interpolate(
    frame,
    [P_START.cta - 12, P_START.cta + 6],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 70% at 50% 18%, ${p.g0} 0%, ${p.g1} 52%, ${p.g2} 100%)`,
        direction: rtl ? "rtl" : "ltr",
        fontFamily: fonts.body,
        color: p.ink,
      }}
    >
      {/* توهّج خلف القارورة */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: 900,
            height: 900,
            marginTop: bottleY,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${p.acc}33 0%, transparent 66%)`,
            opacity: bottleOut,
          }}
        />
      </AbsoluteFill>

      {/* القارورة */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: bottleW,
            marginTop: bottleY,
            opacity: bottleOut * interpolate(bottleIn, [0, 1], [0, 1]),
            transform: `scale(${interpolate(bottleIn, [0, 1], [0.86, 1])})`,
          }}
        >
          <Img
            src={asset(bottleImage)}
            style={{
              width: "100%",
              aspectRatio: "1",
              objectFit: "cover",
              borderRadius: 20,
              boxShadow: "0 50px 110px -40px rgba(0,0,0,.95)",
            }}
          />
        </div>
      </AbsoluteFill>

      {/* ١ — الخطّاف */}
      {hookB.active && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            padding: "0 100px 300px",
            opacity: hookB.opacity,
          }}
        >
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: 68,
              lineHeight: rtl ? 1.6 : 1.2,
              textAlign: "center",
              whiteSpace: "pre-line",
              transform: `translateY(${interpolate(hookB.local, [0, 22], [30, 0], {
                extrapolateRight: "clamp",
              })}px)`,
            }}
          >
            {hook}
          </div>
        </AbsoluteFill>
      )}

      {/* ٢٣٤ — طبقات الهرم */}
      {layers.map((layer, i) => {
        const b = layerBeats[i];
        if (!b || !b.active) return null;
        return (
          <AbsoluteFill
            key={layer.label}
            style={{
              justifyContent: "flex-end",
              padding: "0 100px 300px",
              opacity: b.opacity,
            }}
          >
            <div
              style={{
                fontSize: 36,
                letterSpacing: rtl ? 0 : 8,
                textTransform: rtl ? "none" : "uppercase",
                color: p.acc,
                textAlign: "center",
                marginBottom: 26,
              }}
            >
              {layer.label}
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: 58,
                lineHeight: rtl ? 1.65 : 1.3,
                textAlign: "center",
                transform: `translateY(${interpolate(b.local, [0, 20], [26, 0], {
                  extrapolateRight: "clamp",
                })}px)`,
              }}
            >
              {layer.notes}
            </div>
          </AbsoluteFill>
        );
      })}

      {/* ٥ — الحكم */}
      {verdictB.active && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            padding: "0 100px 340px",
            opacity: verdictB.opacity,
          }}
        >
          <div
            style={{
              fontSize: 50,
              lineHeight: rtl ? 1.8 : 1.4,
              textAlign: "center",
              color: p.ink,
            }}
          >
            {verdict}
          </div>
        </AbsoluteFill>
      )}

      {/* ٦ — الختام */}
      {ctaB.active && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: ctaB.opacity,
          }}
        >
          <div
            style={{
              fontSize: 34,
              letterSpacing: rtl ? 0 : 8,
              textTransform: rtl ? "none" : "uppercase",
              color: p.acc,
            }}
          >
            {house}
          </div>
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: 84,
              marginTop: 16,
              lineHeight: rtl ? 1.4 : 1.1,
              textAlign: "center",
              padding: "0 80px",
            }}
          >
            {product}
          </div>
          <div style={{ fontSize: 46, color: p.acc, marginTop: 40 }}>
            {price} · {size}
          </div>
          <div style={{ fontSize: 40, color: p.soft, marginTop: 52 }}>shama.ly</div>
        </AbsoluteFill>
      )}

      {/* شريط التقدّم */}
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div style={{ height: 6, background: `${p.acc}22` }}>
          <div
            style={{
              height: "100%",
              width: `${interpolate(frame, [0, P_TOTAL], [0, 100], {
                extrapolateRight: "clamp",
              })}%`,
              background: p.acc,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
