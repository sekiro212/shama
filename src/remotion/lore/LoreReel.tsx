/**
 * ===========================================================================
 * الملف: LoreReel.tsx
 * الدور: ريلز عمودي 1080×1920 لسلسلة "البروفايل العطري" — شخصية واحدة
 *        تُقابَل بعطر واحد من الكتالوج.
 *
 * الكاروسيل يدفن الشخصية خلف سحبة. الريل يضعها في الإطار الأول، وهو ما
 * يجلب الوصول لحسابٍ دون العشرة آلاف متابع.
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
import { BEAT_START, BEATS, FALLBACK_PALETTE, LorePalette } from "./theme";
import { getFonts } from "../fonts";

/* نوعٌ مُستعار (type) لا واجهة (interface) عن قصد: قيد Remotion على
   <Composition> هو `Props extends Record<string, unknown>`، وTypeScript
   يمنح فهرسًا ضمنيًّا للأنواع المُستعارة دون الواجهات. تحويله إلى واجهة
   يُفشل الاستنتاج فتتحوّل الخصائص إلى Record<string, unknown> ويسقط البناء. */
export type LoreReelProps = {
  language: "ar" | "en";
  characterImage: string;
  bottleImages: string[]; // واحدة أو اثنتان — بعض الشخصيات مبنيّة على ثنائية
  kicker: string;
  character: string;
  epithet: string;
  question: string;
  house: string;
  product: string;
  why: string;
  notes: string[];
  price: string;
};

const asset = (p: string) => (p.startsWith("http") ? p : staticFile(p));

/** يظهر ويختفي داخل نافذة زمنية، مع هامش تلاشٍ ثابت. */
const useBeat = (start: number, len: number, fade = 10) => {
  const f = useCurrentFrame();
  const local = f - start;
  const inOpacity = interpolate(local, [0, fade], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outOpacity = interpolate(local, [len - fade, len], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { local, opacity: Math.min(inOpacity, outOpacity), active: local >= 0 && local < len };
};

export const LoreReel: React.FC<LoreReelProps & { palette?: LorePalette }> = ({
  language,
  characterImage,
  bottleImages,
  kicker,
  character,
  epithet,
  question,
  house,
  product,
  why,
  notes,
  price,
  palette = FALLBACK_PALETTE,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);
  const rtl = language === "ar";
  const p = palette;

  // الوجه يبقى طوال الفيلم كخلفية، ويزحف ببطء (Ken Burns) كي لا تجمد الصورة.
  const artScale = interpolate(frame, [0, BEAT_START.cta + BEATS.cta], [1.08, 1.22], {
    extrapolateRight: "clamp",
  });
  // يعتم تدريجيًّا بعد المقطعين الأولين ليترك المجال للقارورة.
  const artDim = interpolate(
    frame,
    [BEAT_START.question, BEAT_START.reveal],
    [0.72, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // طبقة تعتيم مسطّحة فوق الصورة. التدرّج وحده لم يكفِ: شعر مالينيا أحمر
  // ساطع ومزدحم، والنصّ كان يتصارع معه بدل أن يجلس فوقه.
  const flatDim = interpolate(
    frame,
    [0, BEAT_START.question, BEAT_START.reveal],
    [0.34, 0.5, 0.76],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const hook = useBeat(BEAT_START.hook, BEATS.hook);
  const name = useBeat(BEAT_START.name, BEATS.name);
  const question_ = useBeat(BEAT_START.question, BEATS.question);
  const reveal = useBeat(BEAT_START.reveal, BEATS.reveal);
  const notesB = useBeat(BEAT_START.notes, BEATS.notes);
  const cta = useBeat(BEAT_START.cta, BEATS.cta);

  // القارورة تدخل بنابض بدل تلاشٍ خطّي — الحركة هي ما يوقف الإبهام.
  const bottleIn = spring({
    frame: frame - BEAT_START.reveal,
    fps,
    config: { damping: 200, mass: 0.7 },
  });

  const base: React.CSSProperties = {
    direction: rtl ? "rtl" : "ltr",
    fontFamily: fonts.body,
    color: p.ink,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: p.g2, ...base }}>
      {/* الوجه */}
      <AbsoluteFill>
        <Img
          src={asset(characterImage)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 28%",
            transform: `scale(${artScale})`,
          }}
        />
      </AbsoluteFill>
      {/* تعتيم مسطّح ثم تدرّج، ليثبت النص فوق الصورة مهما كانت فاتحة */}
      <AbsoluteFill style={{ backgroundColor: p.g2, opacity: flatDim }} />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,.30) 0%, transparent 26%, ${p.g1}cc 56%, ${p.g2}f2 78%, ${p.g2} 92%)`,
          opacity: artDim,
        }}
      />

      {/* ١ — الخطّاف */}
      {hook.active && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            padding: "0 90px 420px",
            opacity: hook.opacity,
          }}
        >
          <div
            style={{
              fontSize: 48,
              letterSpacing: rtl ? 0 : 10,
              textTransform: rtl ? "none" : "uppercase",
              color: p.acc,
              transform: `translateY(${interpolate(hook.local, [0, 20], [24, 0], {
                extrapolateRight: "clamp",
              })}px)`,
            }}
          >
            {kicker}
          </div>
        </AbsoluteFill>
      )}

      {/* ٢ — الاسم */}
      {name.active && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            padding: "0 90px 360px",
            opacity: name.opacity,
          }}
        >
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: 150,
              lineHeight: rtl ? 1.3 : 1.0,
              transform: `translateY(${interpolate(name.local, [0, 24], [40, 0], {
                extrapolateRight: "clamp",
              })}px)`,
            }}
          >
            {character}
          </div>
          <div style={{ fontSize: 42, color: p.soft, marginTop: 18 }}>{epithet}</div>
        </AbsoluteFill>
      )}

      {/* ٣ — السؤال */}
      {question_.active && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            padding: "0 110px",
            opacity: question_.opacity,
          }}
        >
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: 62,
              lineHeight: rtl ? 1.7 : 1.28,
              textAlign: "center",
            }}
          >
            {question}
          </div>
        </AbsoluteFill>
      )}

      {/* ٤ — كشف القارورة */}
      {reveal.active && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: reveal.opacity,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 28,
              width: bottleImages.length > 1 ? 820 : 620,
              transform: `scale(${interpolate(bottleIn, [0, 1], [0.82, 1])})`,
            }}
          >
            {bottleImages.map((b) => (
              <Img
                key={b}
                src={asset(b)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  aspectRatio: "1",
                  objectFit: "cover",
                  borderRadius: 18,
                  boxShadow: "0 40px 90px -30px rgba(0,0,0,.95)",
                }}
              />
            ))}
          </div>
          <div
            style={{
              marginTop: 44,
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
              fontWeight: 700,
              fontSize: 76,
              marginTop: 12,
              lineHeight: rtl ? 1.4 : 1.1,
              textAlign: "center",
              padding: "0 80px",
            }}
          >
            {product}
          </div>
        </AbsoluteFill>
      )}

      {/* ٥ — المكوّنات */}
      {notesB.active && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            padding: "0 100px",
            opacity: notesB.opacity,
          }}
        >
          <div
            style={{
              fontSize: 46,
              lineHeight: 1.75,
              color: p.ink,
              textAlign: "center",
              marginBottom: 52,
            }}
          >
            {why}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              justifyContent: "center",
            }}
          >
            {notes.map((n, i) => (
              <span
                key={n}
                style={{
                  fontSize: 32,
                  padding: "14px 30px",
                  borderRadius: 999,
                  border: `1px solid ${p.acc}66`,
                  color: p.soft,
                  opacity: interpolate(notesB.local, [i * 4, i * 4 + 12], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                {n}
              </span>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* ٦ — الختام */}
      {cta.active && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: cta.opacity,
          }}
        >
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 92 }}>
            Shama
          </div>
          <div style={{ fontSize: 38, color: p.soft, marginTop: 14 }}>عطور فاخرة</div>
          <div
            style={{
              marginTop: 46,
              fontSize: 44,
              color: p.acc,
            }}
          >
            {price}
          </div>
          <div style={{ marginTop: 40, fontSize: 40, color: p.ink }}>shama.ly</div>
        </AbsoluteFill>
      )}

      {/* شريط تقدّم رفيع: يخبر المشاهد كم بقي، فيقلّ التسرّب */}
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div style={{ height: 6, background: `${p.acc}22` }}>
          <div
            style={{
              height: "100%",
              width: `${interpolate(
                frame,
                [0, BEAT_START.cta + BEATS.cta],
                [0, 100],
                { extrapolateRight: "clamp" },
              )}%`,
              background: p.acc,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
