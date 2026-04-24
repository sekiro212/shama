import { AbsoluteFill, Audio, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { dir, isRtl, t, type Lang } from "../i18n";
import { getFonts } from "../fonts";
import { GoldParticles } from "../components/GoldParticles";
import { sceneAudio } from "../audio";

type Props = {
  language: Lang;
  brandName: string;
  goldColor: string;
  primaryColor: string;
  instagramHandle: string;
  tiktokHandle: string;
};

const TOTAL_FRAMES = 150;

export const CTAScene: React.FC<Props> = ({
  language,
  brandName,
  goldColor,
  primaryColor,
  instagramHandle,
  tiktokHandle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);

  const brandEnter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.8 },
  });

  const ruleWidth = interpolate(frame, [22, 56], [0, 420], {
    extrapolateRight: "clamp",
    easing: (x) => 1 - Math.pow(1 - x, 4),
  });

  const urlOpacity = interpolate(frame, [44, 60], [0, 1], { extrapolateRight: "clamp" });
  const urlScale = interpolate(frame, [44, 70], [0.96, 1], {
    extrapolateRight: "clamp",
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });

  const tagOpacity = interpolate(frame, [70, 86], [0, 1], { extrapolateRight: "clamp" });
  const socialOpacity = interpolate(frame, [90, 108], [0, 1], { extrapolateRight: "clamp" });

  const exitOpacity = interpolate(frame, [TOTAL_FRAMES - 12, TOTAL_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
      <Audio src={sceneAudio("cta", language)} volume={0.95} />

      <GoldParticles durationInFrames={TOTAL_FRAMES} />

      <div
        style={{
          opacity: brandEnter,
          transform: `translateY(${(1 - brandEnter) * 16}px)`,
          fontFamily: fonts.body,
          fontSize: 22,
          fontWeight: 600,
          color: goldColor,
          letterSpacing: 6,
          textTransform: "uppercase",
          marginBottom: 26,
          direction: "ltr",
        }}
      >
        {brandName}
      </div>

      <div
        style={{
          height: 1,
          width: ruleWidth,
          background: `linear-gradient(90deg, transparent 0%, ${goldColor} 50%, transparent 100%)`,
          marginBottom: 30,
        }}
      />

      <div
        style={{
          opacity: urlOpacity,
          transform: `scale(${urlScale})`,
          fontFamily: fonts.display,
          fontSize: 144,
          fontWeight: 700,
          color: "#F5F5F5",
          textAlign: "center",
          lineHeight: 1,
          letterSpacing: -2,
          textShadow: `0 0 60px ${primaryColor}33`,
        }}
      >
        <span dir="ltr">{t("cta_url", language)}</span>
      </div>

      <div
        style={{
          opacity: tagOpacity,
          marginTop: 30,
          fontFamily: fonts.body,
          fontSize: 36,
          fontWeight: 400,
          color: "rgba(245,245,245,0.75)",
          textAlign: "center",
          letterSpacing: isRtl(language) ? 0 : 0.5,
          padding: "0 40px",
        }}
      >
        {t("cta_tag", language)}
      </div>

      <div
        style={{
          opacity: socialOpacity,
          marginTop: 80,
          display: "flex",
          flexDirection: "row",
          gap: 40,
          fontFamily: fonts.body,
          fontSize: 22,
          fontWeight: 500,
          color: "rgba(245,245,245,0.55)",
          letterSpacing: 1,
          direction: "ltr",
        }}
      >
        <span>{instagramHandle}</span>
        <span style={{ color: goldColor, opacity: 0.5 }}>·</span>
        <span>{tiktokHandle}</span>
      </div>
    </AbsoluteFill>
  );
};
