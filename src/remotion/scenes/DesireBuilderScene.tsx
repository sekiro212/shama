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
  weights: ["400", "700"],
  subsets: ["latin"],
});

const { fontFamily: interFont } = loadInter("normal", {
  weights: ["300"],
  subsets: ["latin"],
});

type Props = {
  goldColor: string;
  language: "en" | "ar";
};

const EN_LINES = [
  "Each bottle",
  "tells a story.",
  "Each scent creates",
  "memories that",
  "last forever.",
];

const AR_LINES = [
  "كل زجاجة",
  "تحكي قصة.",
  "كل عطر يصنع",
  "ذكريات",
  "تدوم للأبد.",
];

export const DesireBuilderScene: React.FC<Props> = ({ goldColor, language }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const isAr = language === "ar";

  const lines = isAr ? AR_LINES : EN_LINES;

  const shimmerX = interpolate(frame, [20, durationInFrames], [-20, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 60%, #1a1a2e 0%, #0A0A0A 70%)`,
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
          paddingInline: 60,
          gap: 4,
        }}
      >
        {lines.map((line, i) => {
          const lineStart = i * 14;
          const lineSpring = spring({
            frame: frame - lineStart,
            fps,
            config: { damping: 200 },
          });

          const lineOpacity = interpolate(
            frame,
            [lineStart, lineStart + 18],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          const lineY = interpolate(lineSpring, [0, 1], [25, 0]);

          const isAccent = line.includes("forever") || line.includes("للأبد");

          return (
            <div
              key={i}
              style={{
                fontFamily: playfairFont,
                fontSize: isAccent ? 58 : 52,
                fontWeight: isAccent ? 700 : 400,
                color: isAccent ? goldColor : "#FFFFFF",
                textAlign: "center",
                opacity: lineOpacity,
                transform: `translateY(${lineY}px)`,
                lineHeight: 1.3,
                position: "relative",
              }}
            >
              {line}
              {isAccent && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(90deg, transparent ${shimmerX - 15}%, rgba(255, 235, 100, 0.6) ${shimmerX}%, rgba(255, 255, 255, 0.9) ${shimmerX + 5}%, rgba(255, 235, 100, 0.6) ${shimmerX + 10}%, transparent ${shimmerX + 25}%)`,
                    mixBlendMode: "overlay",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          );
        })}

        <div
          style={{
            marginTop: 32,
            fontFamily: interFont,
            fontSize: 22,
            fontWeight: 300,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: interpolate(frame, [60, 80], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            textAlign: "center",
          }}
        >
          {isAr ? "شما | عطور فاخرة" : "Shama | Luxury Fragrances"}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
