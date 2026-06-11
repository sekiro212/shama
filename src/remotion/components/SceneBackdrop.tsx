import { AbsoluteFill, useCurrentFrame } from "remotion";

type Props = {
  primaryColor: string;
  goldColor: string;
  // Per-scene seed so each scene's glow sits in a slightly different place.
  seed?: number;
  // Overall glow strength (0–1). Hook/CTA can run hotter.
  intensity?: number;
};

// Shared cinematic backdrop: a near-black base with two slowly drifting radial
// glows (brand blue + gold), a soft vignette, and a static film-grain layer.
// Replaces the flat #0A0A0A so no scene ever reads as dead black.
export const SceneBackdrop: React.FC<Props> = ({
  primaryColor,
  goldColor,
  seed = 0,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();

  // Very slow organic drift (full cycle ~12s) so the light feels alive but calm.
  const t = frame / 360;
  const blueX = 30 + Math.sin(t * Math.PI * 2 + seed) * 12;
  const blueY = 28 + Math.cos(t * Math.PI * 2 + seed * 1.3) * 10;
  const goldX = 72 + Math.cos(t * Math.PI * 2 + seed * 0.7) * 12;
  const goldY = 74 + Math.sin(t * Math.PI * 2 + seed * 1.7) * 10;

  const blueA = (0.22 * intensity).toFixed(3);
  const goldA = (0.16 * intensity).toFixed(3);

  return (
    <AbsoluteFill style={{ backgroundColor: "#080809" }}>
      {/* Drifting brand-blue glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 50% at ${blueX}% ${blueY}%, ${primaryColor}${alpha(blueA)} 0%, transparent 70%)`,
        }}
      />
      {/* Drifting gold glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(55% 45% at ${goldX}% ${goldY}%, ${goldColor}${alpha(goldA)} 0%, transparent 68%)`,
        }}
      />
      {/* Soft vignette to focus the center */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {/* Static film grain */}
      <AbsoluteFill
        style={{
          opacity: 0.06,
          mixBlendMode: "overlay",
          backgroundImage: GRAIN_URL,
          backgroundSize: "180px 180px",
        }}
      />
    </AbsoluteFill>
  );
};

// Convert a 0–1 decimal-string alpha into a 2-digit hex suffix for #RRGGBB + AA.
function alpha(a: string): string {
  const n = Math.round(Math.min(1, Math.max(0, parseFloat(a))) * 255);
  return n.toString(16).padStart(2, "0");
}

// Inline SVG fractal noise → data URL. Deterministic, no asset fetch.
const GRAIN_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">` +
  `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>` +
  `<feColorMatrix type="saturate" values="0"/></filter>` +
  `<rect width="100%" height="100%" filter="url(#n)"/></svg>`;

const GRAIN_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(GRAIN_SVG)}")`;
