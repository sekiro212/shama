/**
 * ===========================================================================
 * مشهد "الحل" (Solution Scene)
 * ---------------------------------------------------------------------------
 * مشهد من الفيديو الإعلاني (Remotion) يقدّم الحل لمشكلة الشراء الأعمى:
 * توفّر عيّنات بأحجام متعددة (3 مل، 10 مل، 30 مل). يعرض عنواناً مع خط ذهبي
 * يتمدد تحته، ثم ثلاث قوارير بأحجام/ارتفاعات متدرّجة تظهر بالتتابع مع طفو
 * خفيف ولمعة ضوئية، ثم نص توضيحي سفلي.
 * الهدف: إبراز أن العميل يستطيع التجربة بعيّنة قبل شراء الزجاجة الكاملة.
 * ===========================================================================
 */
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { dir, isRtl, t, type Lang } from "../i18n";
import { getFonts } from "../fonts";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { KineticText } from "../components/KineticText";
import { LightSweep } from "../components/LightSweep";

type Props = {
  language: Lang;
  goldColor: string;
  primaryColor: string;
};

// أحجام العيّنات وارتفاع كل قارورة بالبكسل (الأكبر حجماً = الأعلى)
const SAMPLES = [
  { ml: "3ml", height: 220 },
  { ml: "10ml", height: 280 },
  { ml: "30ml", height: 340 },
];

/**
 * مكوّن مشهد الحل.
 * props: اللغة واللونان الذهبي والأساسي للعلامة.
 */
export const SolutionScene: React.FC<Props> = ({ language, goldColor, primaryColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);
  const rtl = isRtl(language);

  // تلاشي ظهور النص السفلي بين الإطارين 54 و68
  const subOpacity = interpolate(frame, [54, 68], [0, 1], { extrapolateRight: "clamp" });

  // عرض الخط الذهبي تحت العنوان يتمدد من 0 إلى 320 بمنحنى تباطؤ (ease-out رباعي)
  const underlineWidth = interpolate(frame, [20, 48], [0, 320], {
    extrapolateRight: "clamp",
    easing: (x) => 1 - Math.pow(1 - x, 4),
  });

  // في وضع RTL يُعكس ترتيب القوارير لتظل متدرّجة بصرياً بالاتجاه الصحيح
  const ordered = rtl ? [...SAMPLES].reverse() : SAMPLES;

  return (
    <AbsoluteFill style={{ direction: dir(language) }}>
      {/* الخلفية المتحركة المشتركة */}
      <SceneBackdrop primaryColor={primaryColor} goldColor={goldColor} seed={1.4} intensity={1} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", direction: dir(language) }}>
      {/* عنوان المشهد بحركة نصّية صاعدة */}
      <KineticText
        mode="rise"
        delay={0}
        rtl={rtl}
        style={{
          fontFamily: fonts.display,
          fontSize: 90,
          fontWeight: rtl ? 800 : 700,
          color: "#F5F5F5",
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: rtl ? 0 : -0.5,
          padding: "0 40px",
        }}
      >
        {t("solution_title", language)}
      </KineticText>

      {/* الخط الذهبي المتوهّج تحت العنوان — يتمدد عرضه عبر underlineWidth */}
      <div
        style={{
          marginTop: 18,
          height: 3,
          width: underlineWidth,
          background: goldColor,
          borderRadius: 2,
          boxShadow: `0 0 16px ${goldColor}88`,
        }}
      />

      <div
        style={{
          position: "relative",
          marginTop: 80,
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 60,
          padding: "0 30px",
        }}
      >
        {ordered.map((s, i) => {
          // كل قارورة تدخل بتأخير 9 إطارات عن سابقتها (تأثير التتابع)
          const enter = spring({
            frame: frame - 12 - i * 9,
            fps,
            config: { damping: 14, stiffness: 100, mass: 0.7 },
          });
          // طفو خفيف ومستمر عبر دالة الجيب، بفارق طور لكل قارورة لتبدو غير متزامنة
          // gentle continuous float, phase-offset per vial
          const float = Math.sin((frame + i * 20) / 22) * 5;
          return (
            <div
              key={s.ml}
              style={{
                opacity: enter,
                transform: `translateY(${(1 - enter) * 40 + float}px)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 84,
                  height: s.height,
                  background:
                    "linear-gradient(180deg, rgba(212,175,55,0.0) 0%, rgba(212,175,55,0.18) 60%, rgba(212,175,55,0.55) 100%)",
                  borderRadius: 14,
                  border: "1px solid rgba(212,175,55,0.35)",
                  overflow: "hidden",
                  boxShadow: "0 30px 80px rgba(212,175,55,0.15)",
                }}
              >
                {/* cap */}
                <div
                  style={{
                    position: "absolute",
                    top: -22,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 36,
                    height: 28,
                    background: "#1A1A1C",
                    borderRadius: 6,
                    border: "1px solid rgba(245,245,245,0.12)",
                  }}
                />
                {/* لمعة ضوئية تمرّ على كل قارورة بتأخير متدرّج حسب ترتيبها */}
                <LightSweep delay={26 + i * 8} duration={30} bandWidth={60} color="rgba(255,240,200,0.5)" />
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 26,
                  fontWeight: 600,
                  color: "rgba(245,245,245,0.88)",
                  letterSpacing: 0.6,
                  direction: "ltr",
                }}
              >
                {s.ml}
              </div>
            </div>
          );
        })}
      </div>

      {/* النص التوضيحي السفلي — يظهر بعد ظهور القوارير عبر subOpacity */}
      <div
        style={{
          opacity: subOpacity,
          marginTop: 60,
          fontFamily: fonts.body,
          fontSize: 30,
          fontWeight: 400,
          color: "rgba(245,245,245,0.6)",
          textAlign: "center",
          letterSpacing: 0.3,
          padding: "0 40px",
        }}
      >
        {t("solution_sub", language)}
      </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
