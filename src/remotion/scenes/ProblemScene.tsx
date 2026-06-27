/**
 * ===========================================================================
 * مشهد "المشكلة" (Problem Scene)
 * ---------------------------------------------------------------------------
 * أول مشهد سردي في الفيديو الإعلاني (Remotion) يطرح المشكلة التي يحلّها المتجر.
 * يعرض عبارة تشويقية (هوك) بحركة نصّية صاعدة، ثم يَعدّ السعر تصاعدياً حتى سعر
 * الشراء "الأعمى" (دون تجربة العطر)، وبعدها يُشطب السعر بخط أحمر للدلالة على
 * أن المال "ضاع". يستند المشهد إلى مبدأ النفور من الخسارة (loss aversion).
 * ===========================================================================
 */
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { dir, isRtl, t, formatPrice, type Lang } from "../i18n";
import { getFonts } from "../fonts";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { KineticText } from "../components/KineticText";

type Props = {
  language: Lang;
  blindPrice: number;
  goldColor: string;
  primaryColor: string;
};

/**
 * مكوّن مشهد المشكلة.
 * props: اللغة، سعر الشراء الأعمى (blindPrice)، واللونان الذهبي والأساسي.
 */
export const ProblemScene: React.FC<Props> = ({ language, blindPrice, goldColor, primaryColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);
  const rtl = isRtl(language);

  // تلاشي ظهور النص الفرعي (الذي يحوي السعر) بين الإطارين 22 و36
  const subOpacity = interpolate(frame, [22, 36], [0, 1], { extrapolateRight: "clamp" });

  // يَعدّ السعر تصاعدياً حتى سعر الشراء الأعمى، ثم يُشطب — أي أن المال "ضاع".
  // تجسيد بصري لمبدأ النفور من الخسارة.
  // Price counts up to the blind-buy price, then a strike-through slashes it — the
  // money is "gone". Loss aversion made visible.
  const counterStart = 20; // إطار بدء عدّاد السعر
  // قيمة الـ spring (من 0 إلى ~1) تُستخدم كنسبة للسعر المعروض
  const counterProgress = spring({
    frame: frame - counterStart,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.7 },
  });
  const shownPrice = Math.round(counterProgress * blindPrice); // السعر المعروض حالياً أثناء العدّ
  const priceText = formatPrice(shownPrice, language);

  // عند الإطار 46 يكون العدّاد قد بلغ السعر الكامل، فيُشطب بالأحمر دلالةً على ضياع المال.
  // Once the counter lands on the full price, slash it red — the money is gone.
  const struck = frame >= 46;

  return (
    <AbsoluteFill style={{ direction: dir(language) }}>
      {/* الخلفية المتحركة المشتركة */}
      <SceneBackdrop primaryColor={primaryColor} goldColor={goldColor} seed={0} intensity={1.15} />

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          direction: dir(language),
        }}
      >
      {/* العبارة التشويقية (الهوك) بحركة نصّية صاعدة متتابعة الحروف (stagger) */}
      <KineticText
        mode="rise"
        delay={2}
        stagger={4}
        rtl={rtl}
        style={{
          fontFamily: fonts.display,
          fontSize: rtl ? 86 : 100,
          fontWeight: rtl ? 800 : 700,
          color: "#F5F5F5",
          textAlign: "center",
          lineHeight: 1.18,
          maxWidth: 940,
          padding: "0 56px",
          letterSpacing: rtl ? 0 : -1.5,
        }}
      >
        {t("problem_hook", language)}
      </KineticText>

      {/* النص الفرعي المتضمّن السعر — يظهر عبر subOpacity */}
      <div
        style={{
          opacity: subOpacity,
          marginTop: 58,
          fontFamily: fonts.body,
          fontSize: 44,
          fontWeight: 400,
          color: "rgba(245,245,245,0.72)",
          letterSpacing: 0.2,
          textAlign: "center",
          direction: dir(language),
          lineHeight: 1.3,
          padding: "0 40px",
          maxWidth: 1000,
        }}
      >
        {/* رقم السعر — ذهبي أثناء العدّ، ثم أحمر مشطوب بعد بلوغ السعر الكامل (struck) */}
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 66,
            fontWeight: 700,
            color: struck ? "#FF5F57" : goldColor,
            fontVariantNumeric: "tabular-nums",
            textDecoration: struck ? "line-through" : "none",
            textDecorationColor: "#FF5F57",
            textDecorationThickness: 5,
            textShadow: struck ? "0 0 22px rgba(255,95,87,0.45)" : "none",
            marginInlineEnd: 14,
          }}
        >
          {priceText}
        </span>
        {t("problem_sub_suffix", language)}
      </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
