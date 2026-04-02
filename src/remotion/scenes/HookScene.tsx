import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GoldParticles } from "../components/GoldParticles";

const { fontFamily: interFont } = loadFont("normal", {
  weights: ["300", "700"],
  subsets: ["latin"],
});

type Props = {
  language: "en" | "ar";
};

export const HookScene: React.FC<Props> = ({ language }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const isAr = language === "ar";

  const bgOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const textScale = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200 },
  });

  const textOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subOpacity = interpolate(frame, [35, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const question = isAr ? "ما هو العطر الذي يعبر عنك؟" : "What scent defines you?";
  const sub = isAr ? "اكتشف هويتك العطرية" : "Find your olfactory identity";

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, #1a1a2e 0%, #0A0A0A 70%)`,
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
          gap: 24,
        }}
      >
        <div
          style={{
            fontFamily: interFont,
            fontSize: 64,
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            transform: `scale(${textScale})`,
            opacity: textOpacity,
            paddingInline: 60,
            lineHeight: 1.2,
            letterSpacing: -1,
          }}
        >
          {question}
        </div>

        <div
          style={{
            fontFamily: interFont,
            fontSize: 28,
            fontWeight: 300,
            color: "#D4AF37",
            textAlign: "center",
            opacity: subOpacity,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          {sub}
        </div>

        <div
          style={{
            width: 60,
            height: 2,
            backgroundColor: "#D4AF37",
            opacity: subOpacity,
            marginTop: 8,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
