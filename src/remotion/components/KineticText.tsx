import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

type Props = {
  children: string;
  // When the reveal starts (frame, relative to the enclosing Sequence).
  delay?: number;
  // "rise" reveals the whole block with an upward mask; "words" staggers word-by-word.
  mode?: "rise" | "words";
  // Per-word stagger (frames) in "words" mode.
  stagger?: number;
  rtl?: boolean;
  style?: React.CSSProperties;
};

// Premium headline reveal. Uses an overflow-clipped mask + translateY rise (never
// per-character opacity, per Remotion's text-animation guidance). "words" mode
// staggers each word in reading order for a kinetic, viral-feeling entrance.
export const KineticText: React.FC<Props> = ({
  children,
  delay = 0,
  mode = "rise",
  stagger = 4,
  rtl = false,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (mode === "words") {
    const words = children.split(" ");
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          flexDirection: rtl ? "row-reverse" : "row",
          ...style,
        }}
      >
        {words.map((word, i) => {
          const p = spring({
            frame: frame - delay - i * stagger,
            fps,
            config: { damping: 16, stiffness: 110, mass: 0.7 },
          });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                overflow: "hidden",
                paddingBottom: "0.12em",
                marginBottom: "-0.12em",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  transform: `translateY(${(1 - p) * 100}%)`,
                  opacity: p,
                  // keep the inter-word space
                  whiteSpace: "pre",
                }}
              >
                {word}
                {i < words.length - 1 ? " " : ""}
              </span>
            </span>
          );
        })}
      </div>
    );
  }

  // "rise" — single upward mask reveal for the whole block.
  const p = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.8 },
  });
  const opacity = interpolate(p, [0, 0.6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em" }}>
      <div
        style={{
          transform: `translateY(${(1 - p) * 100}%)`,
          opacity,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
};
