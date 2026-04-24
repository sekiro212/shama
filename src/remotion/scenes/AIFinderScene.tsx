import { AbsoluteFill, Audio, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";

const resolveAsset = (url: string) => (url.startsWith("/") ? staticFile(url.slice(1)) : url);
import { dir, isRtl, t, type Lang } from "../i18n";
import { getFonts } from "../fonts";
import { BrowserChrome } from "../components/BrowserChrome";
import { sceneAudio } from "../audio";
import type { Product } from "../schema";

type Props = {
  language: Lang;
  goldColor: string;
  primaryColor: string;
  products: Product[];
};

export const AIFinderScene: React.FC<Props> = ({ language, goldColor, primaryColor, products }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);

  const chromeEnter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.8 },
  });

  const labelOpacity = interpolate(frame, [10, 28], [0, 1], { extrapolateRight: "clamp" });

  const typed = t("ai_typed", language);
  const charsToShow = Math.max(0, Math.min(typed.length, Math.floor((frame - 30) * 0.7)));
  const typedSubstring = typed.slice(0, charsToShow);

  const cursorVisible = Math.floor(frame / 8) % 2 === 0;

  const resultsStart = 30 + Math.ceil(typed.length / 0.7) + 6;
  const exitOpacity = interpolate(frame, [138, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
      <Audio src={sceneAudio("ai", language)} volume={0.95} />

      <div
        style={{
          opacity: labelOpacity,
          marginBottom: 28,
          fontFamily: fonts.body,
          fontSize: 24,
          fontWeight: 500,
          color: goldColor,
          letterSpacing: 2.5,
          textTransform: "uppercase",
        }}
      >
        {t("ai_label", language)}
      </div>

      <div
        style={{
          opacity: chromeEnter,
          transform: `translateY(${(1 - chromeEnter) * 30}px) scale(${0.96 + chromeEnter * 0.04})`,
        }}
      >
        <BrowserChrome url="shama.ly" fontFamily={fonts.body} width={920}>
          <div
            style={{
              padding: "44px 40px 56px",
              display: "flex",
              flexDirection: "column",
              gap: 32,
              minHeight: 540,
              direction: dir(language),
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 18,
                padding: "22px 26px",
                display: "flex",
                flexDirection: isRtl(language) ? "row-reverse" : "row",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${goldColor} 100%)`,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  fontFamily: fonts.body,
                  fontSize: 28,
                  fontWeight: 400,
                  color: "rgba(245,245,245,0.95)",
                  letterSpacing: 0.2,
                  minHeight: 36,
                }}
              >
                {typedSubstring}
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: 28,
                    background: goldColor,
                    marginInlineStart: 4,
                    verticalAlign: "middle",
                    opacity: cursorVisible ? 1 : 0,
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(245,245,245,0.5)",
                  letterSpacing: 1.5,
                  padding: "6px 10px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 6,
                  direction: "ltr",
                }}
              >
                ⌘K
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
              }}
            >
              {products.slice(0, 3).map((p, i) => {
                const cardEnter = spring({
                  frame: frame - resultsStart - i * 8,
                  fps,
                  config: { damping: 18, stiffness: 110, mass: 0.7 },
                });
                return (
                  <div
                    key={i}
                    style={{
                      opacity: cardEnter,
                      transform: `translateY(${(1 - cardEnter) * 20}px)`,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 14,
                      padding: 18,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: "4/5",
                        background: `linear-gradient(160deg, ${primaryColor}22 0%, ${goldColor}22 100%)`,
                        borderRadius: 10,
                        backgroundImage: `url(${resolveAsset(p.imageUrl)})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontSize: 22,
                        fontWeight: 600,
                        color: "#F5F5F5",
                        textAlign: isRtl(language) ? "right" : "left",
                      }}
                    >
                      {p.name[language]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </BrowserChrome>
      </div>

      <div
        style={{
          opacity: interpolate(frame, [resultsStart + 24, resultsStart + 38], [0, 1], { extrapolateRight: "clamp" }),
          marginTop: 36,
          fontFamily: fonts.body,
          fontSize: 28,
          fontWeight: 400,
          color: "rgba(245,245,245,0.65)",
          textAlign: "center",
          letterSpacing: 0.3,
        }}
      >
        {t("ai_caption", language)}
      </div>
    </AbsoluteFill>
  );
};
