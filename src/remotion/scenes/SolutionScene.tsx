import { AbsoluteFill, Audio, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { dir, isRtl, t, type Lang } from "../i18n";
import { getFonts } from "../fonts";
import { sceneAudio } from "../audio";

type Props = {
  language: Lang;
  goldColor: string;
};

const SAMPLES = [
  { ml: "3ml", height: 220 },
  { ml: "10ml", height: 280 },
  { ml: "30ml", height: 340 },
];

export const SolutionScene: React.FC<Props> = ({ language, goldColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 18], [22, 0], { extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3) });

  const subOpacity = interpolate(frame, [56, 70], [0, 1], { extrapolateRight: "clamp" });

  const underlineWidth = interpolate(frame, [22, 50], [0, 320], {
    extrapolateRight: "clamp",
    easing: (x) => 1 - Math.pow(1 - x, 4),
  });

  const exitOpacity = interpolate(frame, [78, 90], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const ordered = isRtl(language) ? [...SAMPLES].reverse() : SAMPLES;

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
      <Audio src={sceneAudio("solution", language)} volume={0.95} />

      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontFamily: fonts.display,
          fontSize: 88,
          fontWeight: isRtl(language) ? 800 : 700,
          color: "#F5F5F5",
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: isRtl(language) ? 0 : -0.5,
          padding: "0 40px",
        }}
      >
        {t("solution_title", language)}
      </div>

      <div
        style={{
          marginTop: 18,
          height: 3,
          width: underlineWidth,
          background: goldColor,
          borderRadius: 2,
        }}
      />

      <div
        style={{
          marginTop: 80,
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 60,
        }}
      >
        {ordered.map((s, i) => {
          const enter = spring({
            frame: frame - 14 - i * 10,
            fps,
            config: { damping: 14, stiffness: 100, mass: 0.7 },
          });
          return (
            <div
              key={s.ml}
              style={{
                opacity: enter,
                transform: `translateY(${(1 - enter) * 40}px)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 84,
                  height: s.height,
                  background: "linear-gradient(180deg, rgba(212,175,55,0.0) 0%, rgba(212,175,55,0.18) 60%, rgba(212,175,55,0.55) 100%)",
                  borderRadius: 14,
                  border: "1px solid rgba(212,175,55,0.35)",
                  position: "relative",
                  boxShadow: "0 30px 80px rgba(212,175,55,0.15)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -22,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 36,
                    height: 28,
                    background: "#1A1A1C",
                    borderRadius: 6,
                    border: "1px solid rgba(245,245,245,0.12)",
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 26,
                  fontWeight: 600,
                  color: "rgba(245,245,245,0.88)",
                  letterSpacing: 0.6,
                  direction: "ltr",
                }}
              >
                {s.ml}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          opacity: subOpacity,
          marginTop: 60,
          fontFamily: fonts.body,
          fontSize: 30,
          fontWeight: 400,
          color: "rgba(245,245,245,0.55)",
          textAlign: "center",
          letterSpacing: 0.3,
          padding: "0 40px",
        }}
      >
        {t("solution_sub", language)}
      </div>
    </AbsoluteFill>
  );
};
