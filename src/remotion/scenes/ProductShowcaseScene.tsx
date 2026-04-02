import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { GlassCard } from "../components/GlassCard";

const { fontFamily: interFont } = loadFont("normal", {
  weights: ["300", "400", "600"],
  subsets: ["latin"],
});

const { fontFamily: playfairFont } = loadPlayfair("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

type Product = {
  name: string;
  price: number;
  imageUrl: string;
};

type Props = {
  products: Product[];
  primaryColor: string;
  goldColor: string;
  language: "en" | "ar";
};

const CARD_SHOW_DURATION = 50;
const CARD_DELAY = 15;

export const ProductShowcaseScene: React.FC<Props> = ({
  products,
  primaryColor,
  goldColor,
  language,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isAr = language === "ar";

  const titleOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(frame, [0, 25], [-20, 0], {
    extrapolateRight: "clamp",
  });

  const currency = isAr ? "د.ل" : "LYD";
  const priceLabel = isAr ? "من" : "from";

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0d1117 0%, #1a2235 60%, #0d1117 100%)",
        direction: isAr ? "rtl" : "ltr",
      }}
    >
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          paddingInline: 40,
        }}
      >
        <div
          style={{
            fontFamily: playfairFont,
            fontSize: 44,
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {isAr ? "عطورنا المميزة" : "Our Signature Scents"}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            width: "100%",
          }}
        >
          {products.slice(0, 3).map((product, i) => {
            const startFrame = i * CARD_DELAY + 15;

            const cardSpring = spring({
              frame: frame - startFrame,
              fps,
              config: { damping: 200 },
            });

            const cardOpacity = interpolate(
              frame,
              [startFrame, startFrame + 20],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            const cardScale = interpolate(cardSpring, [0, 1], [0.85, 1]);

            return (
              <div
                key={product.name}
                style={{
                  transform: `scale(${cardScale}) translateX(${interpolate(cardSpring, [0, 1], [isAr ? 60 : -60, 0])}px)`,
                  opacity: cardOpacity,
                }}
              >
                <GlassCard
                  style={{
                    display: "flex",
                    flexDirection: isAr ? "row-reverse" : "row",
                    alignItems: "center",
                    gap: 20,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: 14,
                      overflow: "hidden",
                      flexShrink: 0,
                      border: `1px solid rgba(212, 175, 55, 0.3)`,
                    }}
                  >
                    <Img
                      src={product.imageUrl}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      textAlign: isAr ? "right" : "left",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: playfairFont,
                        fontSize: 26,
                        fontWeight: 700,
                        color: "#FFFFFF",
                        lineHeight: 1.2,
                      }}
                    >
                      {product.name}
                    </div>
                    <div
                      style={{
                        fontFamily: interFont,
                        fontSize: 18,
                        fontWeight: 300,
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      {priceLabel}
                    </div>
                    <div
                      style={{
                        fontFamily: interFont,
                        fontSize: 28,
                        fontWeight: 600,
                        color: goldColor,
                        lineHeight: 1,
                      }}
                    >
                      {product.price} {currency}
                    </div>
                  </div>

                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      border: `2px solid ${goldColor}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: goldColor,
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    →
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
