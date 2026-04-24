import { AbsoluteFill, Audio, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { dir, isRtl, t, formatPrice, type Lang } from "../i18n";
import { getFonts } from "../fonts";
import { sceneAudio } from "../audio";

type Props = {
  language: Lang;
  blindPrice: number;
  goldColor: string;
};

export const ProblemScene: React.FC<Props> = ({ language, blindPrice, goldColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);

  const hookOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const hookY = interpolate(frame, [0, 18], [22, 0], { extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3) });

  const subOpacity = interpolate(frame, [22, 36], [0, 1], { extrapolateRight: "clamp" });
  const counterStart = 24;
  const counterProgress = spring({
    frame: frame - counterStart,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.7 },
  });
  const shownPrice = Math.round(counterProgress * blindPrice);
  const priceText = formatPrice(shownPrice, language);

  const exitOpacity = interpolate(frame, [78, 90], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "#0A0A0A",
        direction: dir(language),
        alignItems: "center",
        justifyContent: "center",
        opacity: exitOpacity,
      }}
    >
      <Audio src={sceneAudio("problem", language)} volume={0.95} />

      <div
        style={{
          opacity: hookOpacity,
          transform: `translateY(${hookY}px)`,
          fontFamily: fonts.display,
          fontSize: isRtl(language) ? 78 : 96,
          fontWeight: isRtl(language) ? 800 : 700,
          color: "#F5F5F5",
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: 980,
          padding: "0 50px",
          letterSpacing: isRtl(language) ? 0 : -1,
          wordBreak: "break-word",
        }}
      >
        {t("problem_hook", language)}
      </div>

      <div
        style={{
          opacity: subOpacity,
          marginTop: 56,
          fontFamily: fonts.body,
          fontSize: 44,
          fontWeight: 400,
          color: "rgba(245,245,245,0.72)",
          textAlign: "center",
          letterSpacing: 0.2,
          display: "flex",
          flexDirection: isRtl(language) ? "row-reverse" : "row",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 68,
            fontWeight: 700,
            color: goldColor,
            fontVariantNumeric: "tabular-nums",
            minWidth: 140,
            textAlign: isRtl(language) ? "left" : "right",
            direction: "ltr",
          }}
        >
          {priceText}
        </span>
        <span>{t("problem_sub_suffix", language)}</span>
      </div>
    </AbsoluteFill>
  );
};
