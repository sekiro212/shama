import { AbsoluteFill, Audio, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";

const resolveAsset = (url: string) => (url.startsWith("/") ? staticFile(url.slice(1)) : url);
import { dir, isRtl, t, formatPrice, type Lang } from "../i18n";
import { getFonts } from "../fonts";
import { sceneAudio } from "../audio";
import type { Product } from "../schema";

type Props = {
  language: Lang;
  goldColor: string;
  primaryColor: string;
  products: Product[];
};

const PRODUCT_DUR = 50;

export const ProductScene: React.FC<Props> = ({ language, goldColor, primaryColor, products }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 18], [22, 0], { extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3) });

  const cardEnter = spring({
    frame: frame - 8,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.8 },
  });

  const exitOpacity = interpolate(frame, [138, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const productSlots = products.slice(0, 3);
  const slotIndex = Math.min(productSlots.length - 1, Math.floor(Math.max(0, frame - 18) / PRODUCT_DUR));
  const slotLocal = Math.max(0, frame - 18 - slotIndex * PRODUCT_DUR);
  const slotOpacity = interpolate(slotLocal, [0, 8, PRODUCT_DUR - 8, PRODUCT_DUR], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const product = productSlots[slotIndex];

  return (
    <AbsoluteFill
      style={{
        background: "#0A0A0A",
        direction: dir(language),
        alignItems: "center",
        justifyContent: "center",
        opacity: exitOpacity,
        gap: 40,
      }}
    >
      <Audio src={sceneAudio("product", language)} volume={0.95} />

      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontFamily: fonts.display,
          fontSize: isRtl(language) ? 56 : 64,
          fontWeight: isRtl(language) ? 800 : 700,
          color: "#F5F5F5",
          textAlign: "center",
          padding: "0 60px",
          maxWidth: 960,
          lineHeight: 1.2,
          letterSpacing: isRtl(language) ? 0 : -0.5,
          wordBreak: "break-word",
        }}
      >
        {t("product_title", language)}
      </div>

      <div
        style={{
          opacity: cardEnter,
          transform: `translateY(${(1 - cardEnter) * 30}px) scale(${0.96 + cardEnter * 0.04})`,
          width: 760,
          background: "#0F0F10",
          borderRadius: 28,
          overflow: "hidden",
          boxShadow: "0 50px 140px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4/3",
            background: `radial-gradient(ellipse at center, ${primaryColor}22 0%, #0A0A0B 70%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {product && (
            <Img
              src={resolveAsset(product.imageUrl)}
              style={{
                opacity: slotOpacity,
                maxHeight: "85%",
                maxWidth: "60%",
                objectFit: "contain",
                filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.6))",
                transition: "opacity 0.3s",
              }}
            />
          )}
        </div>
        <div
          style={{
            padding: "32px 36px 38px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            direction: dir(language),
          }}
        >
          {product && (
            <>
              <div
                style={{
                  opacity: slotOpacity,
                  fontFamily: fonts.display,
                  fontSize: 44,
                  fontWeight: 700,
                  color: "#F5F5F5",
                  textAlign: isRtl(language) ? "right" : "left",
                  lineHeight: 1.1,
                }}
              >
                {product.name[language]}
              </div>

              <div
                style={{
                  opacity: slotOpacity,
                  display: "flex",
                  flexDirection: isRtl(language) ? "row-reverse" : "row",
                  alignItems: "baseline",
                  gap: 14,
                  fontFamily: fonts.body,
                  fontSize: 30,
                  color: "rgba(245,245,245,0.92)",
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 38,
                    fontWeight: 700,
                    color: goldColor,
                    fontVariantNumeric: "tabular-nums",
                    direction: "ltr",
                  }}
                >
                  {formatPrice(product.price, language)}
                </span>
                <span style={{ fontSize: 22, color: "rgba(245,245,245,0.6)" }}>
                  {language === "ar" ? "دينار · " : "LYD · "}{t("full_bottle", language)}
                </span>
              </div>

              <div
                style={{
                  opacity: slotOpacity,
                  marginTop: 10,
                  display: "flex",
                  flexDirection: isRtl(language) ? "row-reverse" : "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "16px 20px",
                  background: "rgba(212,175,55,0.06)",
                  border: `1px solid ${goldColor}55`,
                  borderRadius: 14,
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 22,
                    color: "rgba(245,245,245,0.88)",
                    display: "flex",
                    flexDirection: isRtl(language) ? "row-reverse" : "row",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <span>{t("sample_from_prefix", language)}</span>
                  <span
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 26,
                      fontWeight: 700,
                      color: goldColor,
                      direction: "ltr",
                    }}
                  >
                    {formatPrice(product.samplePrice, language)}
                  </span>
                  <span>{t("sample_from_suffix", language)}</span>
                </div>
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#0A0A0A",
                    background: goldColor,
                    padding: "10px 18px",
                    borderRadius: 10,
                  }}
                >
                  {t("add_sample", language)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
