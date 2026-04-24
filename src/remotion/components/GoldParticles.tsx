import { useCurrentFrame, interpolate } from "remotion";

const PARTICLES = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  x: ((i * 53 + 17) % 100),
  y: ((i * 37 + 11) % 100),
  size: 1.5 + (i % 4) * 0.8,
  delay: (i * 7) % 40,
  driftX: ((i % 5) - 2) * 15,
  driftY: -20 - (i % 6) * 10,
  opacity: 0.3 + (i % 4) * 0.15,
}));

type Props = {
  durationInFrames: number;
};

export const GoldParticles: React.FC<Props> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {PARTICLES.map((p) => {
        const localFrame = Math.max(0, frame - p.delay);
        const progress = localFrame / (durationInFrames - p.delay);

        const opacity = interpolate(
          localFrame,
          [0, 20, durationInFrames - p.delay - 20, durationInFrames - p.delay],
          [0, p.opacity, p.opacity, 0],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
        );

        const y = interpolate(
          progress,
          [0, 1],
          [p.y, p.y + p.driftY / 10],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
        );

        const x = interpolate(
          progress,
          [0, 1],
          [p.x, p.x + p.driftX / 100],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
        );

        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: "#D4AF37",
              opacity,
              boxShadow: `0 0 ${p.size * 2}px rgba(212, 175, 55, 0.8)`,
            }}
          />
        );
      })}
    </div>
  );
};
