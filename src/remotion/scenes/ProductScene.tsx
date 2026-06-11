import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";

const resolveAsset = (url: string) => (url.startsWith("/") ? staticFile(url.slice(1)) : url);
import { dir, isRtl, t, formatPrice, type Lang } from "../i18n";
import { getFonts } from "../fonts";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { KineticText } from "../components/KineticText";
import { LightSweep } from "../components/LightSweep";
import type { Product } from "../schema";

type Props = {
  language: Lang;
  goldColor: string;
  primaryColor: string;
  products: Product[];
};

const SLOT_START = 16;
const PRODUCT_DUR = 42;

export const ProductScene: React.FC<Props> = ({ language, goldColor, primaryColor, products }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);
  const rtl = isRtl(language);

  const cardEnter = spring({
    frame: frame - 8,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.8 },
  });

  const productSlots = products.slice(0, 3);
  const slotIndex = Math.min(productSlots.length - 1, Math.floor(Math.max(0, frame - SLOT_START) / PRODUCT_DUR));
  const slotLocal = Math.max(0, frame - SLOT_START - slotIndex * PRODUCT_DUR);
  const slotOpacity = interpolate(slotLocal, [0, 8, PRODUCT_DUR - 8, PRODUCT_DUR], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const product = productSlots[slotIndex];

  // Slow ken-burns drift on the bottle while it's on screen.
  const kb = interpolate(slotLocal, [0, PRODUCT_DUR], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = 1.04 + kb * 0.06;
  const imgFloat = Math.sin(frame / 20) * 6;

  return (
    <AbsoluteFill style={{ direction: dir(language) }}>
      <SceneBackdrop primaryColor={primaryColor} goldColor={goldColor} seed={3.9} intensity={1} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", direction: dir(language), gap: 40 }}>
      <KineticText
        mode="rise"
        delay={0}
        rtl={rtl}
        style={{
          fontFamily: fonts.display,
          fontSize: rtl ? 56 : 64,
          fontWeight: rtl ? 800 : 700,
          color: "#F5F5F5",
          textAlign: "center",
          padding: "0 60px",
          maxWidth: 960,
          lineHeight: 1.2,
          letterSpacing: rtl ? 0 : -0.5,
        }}
      >
        {t("product_title", language)}
      </KineticText>

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
            background: `radial-gradient(ellipse at center, ${primaryColor}2e 0%, #0A0A0B 70%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
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
                transform: `translateY(${imgFloat}px) scale(${imgScale})`,
                filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.6))",
              }}
            />
          )}
          {/* gold light catches the glass each time a bottle settles */}
          <LightSweep delay={SLOT_START + slotIndex * PRODUCT_DUR + 6} duration={34} bandWidth={26} />
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
                  textAlign: rtl ? "right" : "left",
                  lineHeight: 1.1,
                }}
              >
                {product.name[language]}
              </div>

              <div
                style={{
                  opacity: slotOpacity,
                  display: "flex",
                  flexDirection: rtl ? "row-reverse" : "row",
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
                  {language === "ar" ? "دينار · " : "LYD · "}
                  {t("full_bottle", language)}
                </span>
              </div>

              <div
                style={{
                  opacity: slotOpacity,
                  marginTop: 10,
                  display: "flex",
                  flexDirection: rtl ? "row-reverse" : "row",
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
                    flexDirection: rtl ? "row-reverse" : "row",
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
    </AbsoluteFill>
  );
};
