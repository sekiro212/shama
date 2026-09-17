/**
 * ===========================================================================
 * الملف: TemptationReel.tsx
 * الدور: ريلز الطُّرفة — «عطر واحد يكفي بســـــ... لا، ما يكفيش!»
 *
 * الفكرة: السين تمتدّ وتمتدّ وتتعرّج عبر الشاشة كأنّ صاحبها يماطل نفسه، ثم
 * يستسلم فتظهر القوارير. العربية أنسب للطُّرفة من الإنجليزية: حروفها متّصلة،
 * فسلسلة «سسسس» ترسم أسنانًا متتابعة تصنع الأفعى بنفسها.
 *
 * التنفيذ: مسارٌ متعرّج طويل داخل SVG عالٍ، والنصّ يجري عليه عبر textPath،
 * والكاميرا تنزلق على المسار بتحريك الحاوية — لا الحروف.
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

export const T_FPS = 30;
export const T_BEATS = {
  setup: 66, // «عطر واحد يكفي بس»
  snake: 210, // السين تتعرّج والكاميرا تتبعها
  payoff: 84, // «لا، ما يكفيش!» + القوارير
  cta: 60,
} as const;
export const T_START = {
  setup: 0,
  snake: T_BEATS.setup,
  payoff: T_BEATS.setup + T_BEATS.snake,
  cta: T_BEATS.setup + T_BEATS.snake + T_BEATS.payoff,
};
export const T_TOTAL =
  T_BEATS.setup + T_BEATS.snake + T_BEATS.payoff + T_BEATS.cta;

/* نوعٌ مُستعار (type) لا واجهة (interface) عن قصد: قيد Remotion على
   <Composition> هو `Props extends Record<string, unknown>`، وTypeScript
   يمنح فهرسًا ضمنيًّا للأنواع المُستعارة دون الواجهات. تحويله إلى واجهة
   يُفشل الاستنتاج فتتحوّل الخصائص إلى Record<string, unknown> ويسقط البناء. */
export type TemptationReelProps = {
  setupA: string; // «عطر واحد يكفي»
  setupB: string; // «بس»
  payoff: string; // «لا، ما يكفيش!»
  ctaLine: string;
  bottles: string[];
  bg: string;
  ink: string;
  acc: string;
};

const asset = (p: string) => (p.startsWith("http") ? p : staticFile(p));

/** بوكيه: دوائر ضوء ناعمة، بأحجام ومواضع ثابتة كي لا يرتجف الإطار. */
const Bokeh: React.FC<{ drift: number }> = ({ drift }) => {
  const blobs = [
    [120, 180, 130], [380, 90, 90], [660, 210, 150], [900, 120, 70],
    [200, 520, 110], [520, 430, 170], [830, 560, 100], [980, 380, 120],
    [90, 860, 140], [420, 800, 90], [700, 940, 130], [960, 800, 80],
    [260, 1180, 120], [600, 1260, 160], [880, 1140, 95], [140, 1450, 110],
    [480, 1520, 130], [820, 1600, 105], [1000, 1420, 85], [300, 1720, 145],
  ];
  return (
    <AbsoluteFill>
      {blobs.map(([x, y, r], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x - r,
            top: y - r + drift * (i % 3 === 0 ? 14 : 7),
            width: r * 2,
            height: r * 2,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(255,250,235,.55) 45%, rgba(255,250,235,0) 72%)",
            filter: "blur(2px)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const TemptationReel: React.FC<TemptationReelProps> = ({
  setupA,
  setupB,
  payoff,
  ctaLine,
  bottles,
  bg,
  ink,
  acc,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts("ar");

  // موجة نازلة: كل حرفٍ يوضع على نقطةٍ منها ويُدار بزاوية المماس، فتبدو
  // السلسلة كأنها تتعرّج. أدقّ من textPath، الذي لا يُعوَّل عليه مع العربية.
  const CANVAS_H = 4200;
  const HUMPS = 3.2;
  const AMP = 360;
  const MIDX = 540;
  const TOP = 300;
  const SPAN = 3300;
  const N = 70;
  const at = (t: number) => {
    const x = MIDX + AMP * Math.sin(t * Math.PI * HUMPS);
    const y = TOP + t * SPAN;
    const dx = AMP * Math.PI * HUMPS * Math.cos(t * Math.PI * HUMPS);
    const dy = SPAN;
    return { x, y, a: (Math.atan2(dy, dx) * 180) / Math.PI - 90 };
  };

  const seen = frame - T_START.snake;
  // نسبة ما "كُتب" من الأفعى، تُستخدم لقصّ النص ولإزاحة الكاميرا معًا.
  const written = interpolate(seen, [0, T_BEATS.snake - 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const SEEN_CHARS = Math.round(written * N);

  // الكاميرا تتبع آخر حرفٍ كُتب، فيبقى طرف الأفعى في الإطار دائمًا.
  const head = at(Math.min(written, 1));
  const camY = Math.min(0, 1150 - head.y);

  const payoffB = frame - T_START.payoff;
  const payoffIn = spring({
    frame: payoffB,
    fps,
    config: { damping: 200, mass: 0.7 },
  });
  const showPayoff = frame >= T_START.payoff;
  const ctaIn = interpolate(frame, [T_START.cta, T_START.cta + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // كل شيء يتلاشى حين تحين لحظة القوارير
  const stageOut = interpolate(
    frame,
    [T_START.payoff - 10, T_START.payoff + 8],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ background: bg, direction: "rtl", color: ink }}>
      <Bokeh drift={interpolate(frame, [0, T_TOTAL], [0, 30])} />

      {/* المسرح: العبارة ثم الأفعى */}
      <AbsoluteFill style={{ opacity: stageOut }}>
        <div style={{ transform: `translateY(${camY}px)` }}>
          {/* الأفعى: حرفٌ لكل نقطة */}
          {Array.from({ length: SEEN_CHARS }).map((_, i) => {
            const pt = at(i / N);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: pt.x,
                  top: pt.y,
                  transform: `translate(-50%, -50%) rotate(${pt.a}deg)`,
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: 78,
                  lineHeight: 1,
                  color: ink,
                }}
              >
                س
              </div>
            );
          })}

          {/* العبارة الافتتاحية، مثبّتة أعلى اللوحة */}
          <div
            style={{
              position: "absolute",
              top: 90,
              right: 90,
              width: 900,
              textAlign: "right",
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: 104,
              lineHeight: 1.5,
            }}
          >
            {setupA}{" "}
            <span style={{ whiteSpace: "nowrap" }}>
              {setupB}
              {"س".repeat(Math.min(SEEN_CHARS, 5))}
            </span>
          </div>
        </div>
      </AbsoluteFill>

      {/* الاستسلام + القوارير */}
      {showPayoff && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            padding: "0 70px",
          }}
        >
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: 108,
              lineHeight: 1.45,
              textAlign: "center",
              marginTop: -60,
              transform: `translateY(${interpolate(payoffIn, [0, 1], [40, 0])}px)`,
              opacity: payoffIn,
            }}
          >
            {payoff}
          </div>

          {/* منصّات: الوسط أعلى، كما في المرجع */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 16,
              marginTop: 120,
              opacity: payoffIn,
            }}
          >
            {bottles.map((b, i) => {
              const order = [2, 0, 1, 3, 4].indexOf(i); // ترتيب الظهور من الوسط
              const rise = spring({
                frame: payoffB - 6 - order * 5,
                fps,
                config: { damping: 200, mass: 0.6 },
              });
              const lift = [40, 96, 150, 96, 40][i];
              return (
                <div
                  key={b}
                  style={{
                    width: 208,
                    marginBottom: lift,
                    transform: `translateY(${interpolate(rise, [0, 1], [90, 0])}px)`,
                    opacity: rise,
                  }}
                >
                  <Img
                    src={asset(b)}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      objectFit: "cover",
                      borderRadius: 14,
                      boxShadow: "0 26px 50px -22px rgba(90,70,30,.55)",
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 120,
              fontSize: 46,
              color: acc,
              opacity: ctaIn,
              textAlign: "center",
            }}
          >
            {ctaLine}
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 40,
              opacity: ctaIn,
              fontWeight: 700,
            }}
          >
            shama.ly
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
