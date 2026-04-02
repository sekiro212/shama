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
  weights: ["300", "400"],
  subsets: ["latin"],
});

type Props = {
  brandName: string;
  primaryColor: string;
  goldColor: string;
  language: "en" | "ar";
};

export const BrandRevealScene: React.FC<Props> = ({
  brandName,
  primaryColor,
  goldColor,
  language,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const isAr = language === "ar";

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [25, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineWidth = interpolate(frame, [40, 80], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const tagOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtitle = isAr ? "عطور فاخرة" : "LUXURY FRAGRANCES";
  const since = isAr ? "منذ ٢٠٢٤" : "EST. 2024";

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #0A0A0A 0%, #1a2235 50%, #0A0A0A 100%)`,
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
          gap: 20,
        }}
      >
        <div
          style={{
            fontFamily: playfairFont,
            fontSize: 130,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${goldColor} 0%, #FFF5C0 50%, ${goldColor} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            letterSpacing: 8,
            textAlign: "center",
          }}
        >
          {brandName}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: subtitleOpacity,
          }}
        >
          <div
            style={{
              width: lineWidth / 2,
              height: 1,
              backgroundColor: goldColor,
            }}
          />
          <div
            style={{
              fontFamily: interFont,
              fontSize: 20,
              fontWeight: 300,
              color: "rgba(255,255,255,0.7)",
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              width: lineWidth / 2,
              height: 1,
              backgroundColor: goldColor,
            }}
          />
        </div>

        <div
          style={{
            fontFamily: interFont,
            fontSize: 16,
            fontWeight: 300,
            color: goldColor,
            letterSpacing: 4,
            opacity: tagOpacity,
            textTransform: "uppercase",
          }}
        >
          {since}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
