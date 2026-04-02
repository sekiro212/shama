import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { GoldParticles } from "../components/GoldParticles";

const { fontFamily: playfairFont } = loadFont("normal", {
  weights: ["700"],
  subsets: ["latin"],
});

const { fontFamily: interFont } = loadInter("normal", {
  weights: ["300", "400", "600"],
  subsets: ["latin"],
});

type Props = {
  brandName: string;
  tagline: string;
  goldColor: string;
  primaryColor: string;
  instagramHandle: string;
  tiktokHandle: string;
  language: "en" | "ar";
};

export const CTAScene: React.FC<Props> = ({
  brandName,
  tagline,
  goldColor,
  primaryColor,
  instagramHandle,
  tiktokHandle,
  language,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const isAr = language === "ar";

  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const ctaOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ctaScale = spring({
    frame: frame - 20,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  const sampleOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const socialOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoFinalOpacity = interpolate(
    frame,
    [durationInFrames - 25, durationInFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const ctaText = isAr ? "اكتشف عطرك المميز" : "Find Your Signature Scent";
  const sampleText = isAr ? "جرب العينات من ١٥ د.ل فقط" : "Try samples from 15 LYD";
  const shopText = isAr ? "تسوق الآن" : "Shop Now";

  const pulseScale = 1 + 0.03 * Math.sin((frame / fps) * Math.PI * 2);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #1a1f3a 0%, #0A0A0A 70%)`,
        opacity: bgOpacity,
        direction: isAr ? "rtl" : "ltr",
      }}
    >
      <GoldParticles durationInFrames={durationInFrames} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          paddingInline: 48,
        }}
      >
        <div
          style={{
            fontFamily: playfairFont,
            fontSize: 68,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${goldColor} 0%, #FFF5C0 50%, ${goldColor} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textAlign: "center",
            transform: `scale(${titleSpring})`,
            opacity: titleOpacity,
            lineHeight: 1.2,
          }}
        >
          {brandName}
        </div>

        <div
          style={{
            fontFamily: interFont,
            fontSize: 28,
            fontWeight: 300,
            color: "rgba(255,255,255,0.85)",
            textAlign: "center",
            opacity: titleOpacity,
            letterSpacing: 1,
            lineHeight: 1.4,
          }}
        >
          {ctaText}
        </div>

        <div
          style={{
            transform: `scale(${ctaScale * pulseScale})`,
            opacity: ctaOpacity,
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${goldColor}, #FFF5C0, ${goldColor})`,
              borderRadius: 50,
              paddingInline: 56,
              paddingBlock: 20,
              fontFamily: interFont,
              fontSize: 26,
              fontWeight: 600,
              color: "#0A0A0A",
              textAlign: "center",
              boxShadow: `0 0 40px rgba(212, 175, 55, 0.4)`,
            }}
          >
            {shopText}
          </div>
        </div>

        <div
          style={{
            opacity: sampleOpacity,
            fontFamily: interFont,
            fontSize: 22,
            fontWeight: 300,
            color: goldColor,
            textAlign: "center",
            letterSpacing: 1,
          }}
        >
          {sampleText}
        </div>

        <div
          style={{
            width: "80%",
            height: 1,
            backgroundColor: "rgba(212, 175, 55, 0.3)",
            opacity: socialOpacity,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: isAr ? "row-reverse" : "row",
            gap: 32,
            opacity: socialOpacity,
          }}
        >
          <div
            style={{
              fontFamily: interFont,
              fontSize: 20,
              fontWeight: 400,
              color: "rgba(255,255,255,0.7)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 24 }}>📸</span>
            {instagramHandle}
          </div>
          <div
            style={{
              fontFamily: interFont,
              fontSize: 20,
              fontWeight: 400,
              color: "rgba(255,255,255,0.7)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 24 }}>🎵</span>
            {tiktokHandle}
          </div>
        </div>

        <div
          style={{
            opacity: logoFinalOpacity,
            fontFamily: playfairFont,
            fontSize: 42,
            fontWeight: 700,
            color: goldColor,
            letterSpacing: 6,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          {brandName}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
