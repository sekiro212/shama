import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { dir, isRtl, t, type Lang } from "../i18n";
import { getFonts } from "../fonts";
import { GoldParticles } from "../components/GoldParticles";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { LightSweep } from "../components/LightSweep";

type Props = {
  language: Lang;
  brandName: string;
  goldColor: string;
  primaryColor: string;
  instagramHandle: string;
  tiktokHandle: string;
};

export const CTAScene: React.FC<Props> = ({
  language,
  brandName,
  goldColor,
  primaryColor,
  instagramHandle,
  tiktokHandle,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fonts = getFonts(language);
  const rtl = isRtl(language);

  const brandEnter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.8 },
  });

  const ruleWidth = interpolate(frame, [20, 52], [0, 420], {
    extrapolateRight: "clamp",
    easing: (x) => 1 - Math.pow(1 - x, 4),
  });

  const urlSpring = spring({
    frame: frame - 40,
    fps,
    config: { damping: 16, stiffness: 110, mass: 0.8 },
  });
  const urlOpacity = interpolate(urlSpring, [0, 0.6], [0, 1], { extrapolateRight: "clamp" });

  const tagOpacity = interpolate(frame, [66, 82], [0, 1], { extrapolateRight: "clamp" });
  const socialOpacity = interpolate(frame, [86, 104], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ direction: dir(language) }}>
      <SceneBackdrop primaryColor={primaryColor} goldColor={goldColor} seed={0.3} intensity={1.2} />

      <GoldParticles durationInFrames={durationInFrames} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", direction: dir(language) }}>
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
          position: "relative",
          opacity: urlOpacity,
          transform: `scale(${0.94 + urlSpring * 0.06})`,
          fontFamily: fonts.display,
          fontSize: 144,
          fontWeight: 700,
          color: "#F5F5F5",
          textAlign: "center",
          lineHeight: 1,
          letterSpacing: -2,
          textShadow: `0 0 60px ${primaryColor}44`,
          padding: "0 20px",
        }}
      >
        <span dir="ltr">{t("cta_url", language)}</span>
        <LightSweep delay={56} duration={30} bandWidth={34} color="rgba(255,245,210,0.55)" />
      </div>

      <div
        style={{
          opacity: tagOpacity,
          marginTop: 30,
          fontFamily: fonts.body,
          fontSize: 36,
          fontWeight: 400,
          color: "rgba(245,245,245,0.78)",
          textAlign: "center",
          letterSpacing: rtl ? 0 : 0.5,
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
    </AbsoluteFill>
  );
};
