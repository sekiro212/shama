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

export const ProblemScene: React.FC<Props> = ({ language, blindPrice, goldColor, primaryColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);
  const rtl = isRtl(language);

  const subOpacity = interpolate(frame, [22, 36], [0, 1], { extrapolateRight: "clamp" });

  // Price counts up to the blind-buy price, then a strike-through slashes it — the
  // money is "gone". Loss aversion made visible.
  const counterStart = 20;
  const counterProgress = spring({
    frame: frame - counterStart,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.7 },
  });
  const shownPrice = Math.round(counterProgress * blindPrice);
  const priceText = formatPrice(shownPrice, language);

  // Once the counter lands on the full price, slash it red — the money is gone.
  const struck = frame >= 46;

  return (
    <AbsoluteFill style={{ direction: dir(language) }}>
      <SceneBackdrop primaryColor={primaryColor} goldColor={goldColor} seed={0} intensity={1.15} />

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          direction: dir(language),
        }}
      >
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
