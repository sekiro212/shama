/**
 * ===========================================================================
 * الملف: ReviewReel.tsx
 * الدور: ريلز مراجعة — رأي المتجر في عطرٍ واحد، بالإيقاع الذي يهمّ فعلًا.
 *
 * الرأي رأي المتجر نفسه، لا شهادةَ زبونٍ مُختلَقة.
 *
 * المراجعة تُروى بالإيقاع الذي يهمّ فعلًا: الفتحة، ثم كيف يتصرّف على البشرة،
 * ثم الثبات والفوحان، ثم متى تلبسه، ثم الحكم.
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
import { FALLBACK_PALETTE, LorePalette } from "./theme";

export const R_BEATS = {
  hook: 84,
  opening: 78,
  skin: 78,
  power: 84,
  when: 78,
  verdict: 84,
  cta: 60,
} as const;

export type RBeat = keyof typeof R_BEATS;
export const R_ORDER: RBeat[] = [
  "hook", "opening", "skin", "power", "when", "verdict", "cta",
];
export const R_START: Record<RBeat, number> = (() => {
  let t = 0;
  const o = {} as Record<RBeat, number>;
  for (const k of R_ORDER) {
    o[k] = t;
    t += R_BEATS[k];
  }
  return o;
})();
export const R_TOTAL = R_ORDER.reduce((n, k) => n + R_BEATS[k], 0);

export interface ReviewLine {
  label: string;
  body: string;
}

export interface ReviewReelProps {
  language: "ar" | "en";
  bottleImage: string;
  hook: string;
  house: string;
  product: string;
  lines: ReviewLine[]; // الفتحة · على البشرة · الثبات · متى · الحكم
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

export const ReviewReel: React.FC<ReviewReelProps & { palette?: LorePalette }> = ({
  language,
  bottleImage,
  hook,
  house,
  product,
  lines,
  price,
  size,
  palette = FALLBACK_PALETTE,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);
  const rtl = language === "ar";
  const p = palette;

  const hookB = useBeat(R_START.hook, R_BEATS.hook);
  const ctaB = useBeat(R_START.cta, R_BEATS.cta);
  // مُحسوبة مسبقًا لا داخل map: قواعد الـ hooks تمنع استدعاءها في حلقة.
  const b1 = useBeat(R_START.opening, R_BEATS.opening);
  const b2 = useBeat(R_START.skin, R_BEATS.skin);
  const b3 = useBeat(R_START.power, R_BEATS.power);
  const b4 = useBeat(R_START.when, R_BEATS.when);
  const b5 = useBeat(R_START.verdict, R_BEATS.verdict);
  const lineBeats = [b1, b2, b3, b4, b5];

  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.9 } });
  const lift = interpolate(frame, [0, R_TOTAL], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 76% at 50% 12%, ${p.g0} 0%, ${p.g1} 54%, ${p.g2} 100%)`,
        direction: rtl ? "rtl" : "ltr",
        fontFamily: fonts.body,
        color: p.ink,
      }}
    >
      {/* القارورة — تعلو قليلًا مع تقدّم المراجعة */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: 470,
            marginTop: interpolate(lift, [0, 1], [-140, -210]),
            transform: `scale(${interpolate(enter, [0, 1], [0.8, 1])})`,
            opacity: enter,
          }}
        >
          <Img
            src={asset(bottleImage)}
            style={{
              width: "100%",
              aspectRatio: "1",
              objectFit: "cover",
              borderRadius: 16,
              boxShadow: "0 40px 90px -30px rgba(0,0,0,.95)",
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
              fontSize: 66,
              lineHeight: rtl ? 1.6 : 1.2,
              textAlign: "center",
              whiteSpace: "pre-line",
              transform: `translateY(${interpolate(hookB.local, [0, 22], [28, 0], {
                extrapolateRight: "clamp",
              })}px)`,
            }}
          >
            {hook}
          </div>
        </AbsoluteFill>
      )}

      {/* ٢..٦ — بنود المراجعة */}
      {lines.map((ln, i) => {
        const b = lineBeats[i];
        if (!b || !b.active) return null;
        return (
          <AbsoluteFill
            key={ln.label}
            style={{
              justifyContent: "flex-end",
              padding: "0 96px 250px",
              opacity: b.opacity,
            }}
          >
            <div
              style={{
                alignSelf: "center",
                fontSize: 34,
                letterSpacing: rtl ? 0 : 8,
                textTransform: rtl ? "none" : "uppercase",
                color: p.acc,
                marginBottom: 22,
                border: `1px solid ${p.acc}55`,
                borderRadius: 999,
                padding: "10px 30px",
              }}
            >
              {ln.label}
            </div>
            <div
              style={{
                fontSize: 50,
                lineHeight: rtl ? 1.75 : 1.4,
                textAlign: "center",
                transform: `translateY(${interpolate(b.local, [0, 20], [22, 0], {
                  extrapolateRight: "clamp",
                })}px)`,
              }}
            >
              {ln.body}
            </div>
          </AbsoluteFill>
        );
      })}

      {/* ٧ — الختام */}
      {ctaB.active && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "0 90px 220px",
            opacity: ctaB.opacity,
          }}
        >
          <div
            style={{
              fontSize: 32,
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
              fontSize: 74,
              marginTop: 14,
              lineHeight: rtl ? 1.4 : 1.1,
              textAlign: "center",
            }}
          >
            {product}
          </div>
          <div style={{ fontSize: 44, color: p.acc, marginTop: 30 }}>
            {price} · {size}
          </div>
          <div style={{ fontSize: 38, color: p.soft, marginTop: 34 }}>shama.ly</div>
        </AbsoluteFill>
      )}

      {/* شريط التقدّم */}
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div style={{ height: 6, background: `${p.acc}22` }}>
          <div
            style={{
              height: "100%",
              width: `${interpolate(frame, [0, R_TOTAL], [0, 100], {
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
