import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GlassCard } from "../components/GlassCard";
import { AnimatedCounter } from "../components/AnimatedCounter";

const { fontFamily: interFont } = loadFont("normal", {
  weights: ["300", "400", "700"],
  subsets: ["latin"],
});

type Stat = {
  value: number;
  suffix: string;
  label: string;
  labelAr: string;
  decimals?: number;
};

const STATS: Stat[] = [
  { value: 150, suffix: "+", label: "Happy Customers", labelAr: "عميل سعيد", decimals: 0 },
  { value: 100, suffix: "+", label: "Perfumes", labelAr: "عطر فاخر", decimals: 0 },
  { value: 4.6, suffix: "★", label: "Avg Rating", labelAr: "تقييم متوسط", decimals: 1 },
];

type Props = {
  stats: {
    customers: number;
    perfumes: number;
    rating: number;
  };
  primaryColor: string;
  goldColor: string;
  language: "en" | "ar";
};

export const SocialProofScene: React.FC<Props> = ({
  stats,
  primaryColor,
  goldColor,
  language,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isAr = language === "ar";

  const statValues = [stats.customers, stats.perfumes, stats.rating];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(frame, [0, 20], [30, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #0d1117 0%, #1a2235 100%)",
        direction: isAr ? "rtl" : "ltr",
      }}
    >
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          paddingInline: 48,
        }}
      >
        <div
          style={{
            fontFamily: interFont,
            fontSize: 36,
            fontWeight: 300,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: 6,
            textTransform: "uppercase",
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textAlign: "center",
          }}
        >
          {isAr ? "يثق بنا الآلاف" : "Trusted by Thousands"}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            width: "100%",
          }}
        >
          {STATS.map((stat, i) => {
            const cardSpring = spring({
              frame: frame - i * 12,
              fps,
              config: { damping: 200 },
            });

            const cardOpacity = interpolate(
              frame,
              [i * 12, i * 12 + 20],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            return (
              <div
                key={stat.label}
                style={{
                  transform: `translateY(${interpolate(cardSpring, [0, 1], [40, 0])}px)`,
                  opacity: cardOpacity,
                }}
              >
                <GlassCard
                  style={{
                    display: "flex",
                    flexDirection: isAr ? "row-reverse" : "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingInline: 36,
                    paddingBlock: 28,
                  }}
                >
                  <div
                    style={{
                      fontFamily: interFont,
                      fontSize: 22,
                      fontWeight: 400,
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    {isAr ? stat.labelAr : stat.label}
                  </div>
                  <div
                    style={{
                      fontFamily: interFont,
                      fontSize: 56,
                      fontWeight: 700,
                      color: goldColor,
                      lineHeight: 1,
                    }}
                  >
                    <Sequence from={i * 12}>
                      <AnimatedCounter
                        target={statValues[i]}
                        suffix={stat.suffix}
                        durationInFrames={60}
                        decimals={stat.decimals}
                      />
                    </Sequence>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
