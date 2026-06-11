import { useCurrentFrame, interpolate, Easing } from "remotion";

type Props = {
  // When the sweep begins (frame, relative to enclosing Sequence).
  delay?: number;
  duration?: number;
  color?: string;
  // Width of the moving highlight band as a % of the parent width.
  bandWidth?: number;
};

// A diagonal specular highlight that travels across the parent once — the premium
// "light catches the glass" signature. Parent must be position:relative + overflow
// hidden (or clip via a wrapper). Renders nothing before `delay` / after it exits.
export const LightSweep: React.FC<Props> = ({
  delay = 0,
  duration = 26,
  color = "rgba(255,255,255,0.45)",
  bandWidth = 30,
}) => {
  const frame = useCurrentFrame();
  const local = frame - delay;
  if (local < 0 || local > duration) return null;

  // Travel from off the left edge to off the right edge.
  const x = interpolate(local, [0, duration], [-bandWidth - 10, 110], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-30%",
          left: `${x}%`,
          width: `${bandWidth}%`,
          height: "160%",
          transform: "skewX(-18deg)",
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
};
