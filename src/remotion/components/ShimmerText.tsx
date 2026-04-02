import { useCurrentFrame, interpolate } from "remotion";

type Props = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  durationInFrames?: number;
  goldColor?: string;
};

export const ShimmerText: React.FC<Props> = ({
  children,
  style,
  durationInFrames = 60,
  goldColor = "#D4AF37",
}) => {
  const frame = useCurrentFrame();

  const shimmerX = interpolate(frame, [0, durationInFrames], [-50, 150], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", display: "inline-block", ...style }}>
      <span>{children}</span>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, transparent ${shimmerX - 15}%, rgba(212, 175, 55, 0.5) ${shimmerX}%, rgba(255, 235, 100, 0.8) ${shimmerX + 5}%, rgba(212, 175, 55, 0.5) ${shimmerX + 10}%, transparent ${shimmerX + 25}%)`,
          pointerEvents: "none",
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
};
