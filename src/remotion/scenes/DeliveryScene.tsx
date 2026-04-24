import { AbsoluteFill, Audio, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { dir, isRtl, t, type Lang } from "../i18n";
import { getFonts } from "../fonts";
import { sceneAudio } from "../audio";

type Props = {
  language: Lang;
  goldColor: string;
};

// Libya outline traced from Natural Earth simplified borders, projected to a
// 600×440 viewBox. Coast curves around the Gulf of Sirte; eastern border with
// Egypt is near-vertical; southern border traces Sudan/Chad/Niger; west to
// Algeria/Tunisia. Cities are placed at their real lat/lon → SVG coords.
const LIBYA_PATH = [
  "M 184 60",                    // Ras al-Jadeer (Tunisia border)
  "L 200 64",                    // east along coast
  "L 218 66",                    // Tripoli
  "L 240 71",
  "L 257 76",                    // Misrata
  "L 275 86",
  "Q 290 96 305 112",            // coast turns south into Gulf of Sirte
  "L 318 128",                   // bottom of Gulf of Sirte
  "Q 330 132 345 118",           // bay curves back north
  "L 359 95",                    // Benghazi
  "L 380 87",
  "L 410 84",
  "L 439 86",                    // Tobruk
  "L 460 92",                    // Salloum (Egypt border) — NE corner
  "L 462 130",                   // Egypt border — vertical south
  "L 462 180",
  "L 462 230",
  "L 461 273",                   // SE tripoint (Sudan)
  "L 440 282",
  "L 400 290",                   // Sudan border
  "L 350 305",
  "L 300 314",                   // Chad/Sudan border
  "L 250 318",
  "L 199 320",                   // Aouzou strip / Chad border tip
  "L 165 305",
  "L 150 280",                   // Niger triple point
  "L 143 240",                   // Algeria border
  "L 140 200",
  "L 138 170",
  "L 140 140",                   // Algeria-Libya border
  "L 145 110",
  "Q 152 88 165 75",
  "L 184 60",                    // back to start
  "Z",
].join(" ");

// Cities (lat/lon → SVG):
const TRIPOLI = { x: 218, y: 66 };
const MISRATA = { x: 257, y: 76 };
const BENGHAZI = { x: 359, y: 95 };
const SABHA = { x: 243, y: 192 };

export const DeliveryScene: React.FC<Props> = ({ language, goldColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 18], [22, 0], { extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3) });

  const subOpacity = interpolate(frame, [56, 70], [0, 1], { extrapolateRight: "clamp" });

  const mapEnter = spring({
    frame: frame - 8,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.8 },
  });

  // Outline draw-on (stroke-dashoffset trick approximated with opacity)
  const outlineProgress = interpolate(frame, [10, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Truck travels Tripoli → Misrata → curve south through Gulf → Benghazi
  const pathProgress = interpolate(frame, [22, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const exitOpacity = interpolate(frame, [78, 90], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Quadratic bezier from Tripoli through bay-bottom control point to Benghazi.
  // B(t) = (1-t)² P0 + 2(1-t)t P1 + t² P2
  const t01 = pathProgress;
  const ctrl = { x: 295, y: 145 };
  const truckX =
    (1 - t01) * (1 - t01) * TRIPOLI.x +
    2 * (1 - t01) * t01 * ctrl.x +
    t01 * t01 * BENGHAZI.x;
  const truckY =
    (1 - t01) * (1 - t01) * TRIPOLI.y +
    2 * (1 - t01) * t01 * ctrl.y +
    t01 * t01 * BENGHAZI.y;

  // Tangent angle for truck rotation (derivative of bezier)
  const dx =
    2 * (1 - t01) * (ctrl.x - TRIPOLI.x) + 2 * t01 * (BENGHAZI.x - ctrl.x);
  const dy =
    2 * (1 - t01) * (ctrl.y - TRIPOLI.y) + 2 * t01 * (BENGHAZI.y - ctrl.y);
  const truckAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <AbsoluteFill
      style={{
        background: "#0A0A0A",
        direction: dir(language),
        alignItems: "center",
        justifyContent: "center",
        opacity: exitOpacity,
        gap: 32,
      }}
    >
      <Audio src={sceneAudio("delivery", language)} volume={0.95} />

      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontFamily: fonts.display,
          fontSize: 72,
          fontWeight: isRtl(language) ? 800 : 700,
          color: "#F5F5F5",
          textAlign: "center",
          padding: "0 40px",
          lineHeight: 1.15,
          letterSpacing: isRtl(language) ? 0 : -0.5,
        }}
      >
        {t("delivery_title", language)}
      </div>

      <div
        style={{
          opacity: mapEnter,
          transform: `scale(${0.94 + mapEnter * 0.06})`,
          width: 880,
          height: 540,
          position: "relative",
          direction: "ltr",
        }}
      >
        <svg viewBox="120 50 360 290" width="880" height="540" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="route" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={goldColor} stopOpacity="0.95" />
              <stop offset="1" stopColor={goldColor} stopOpacity="0.95" />
            </linearGradient>
            <radialGradient id="cityGlow">
              <stop offset="0" stopColor={goldColor} stopOpacity="0.6" />
              <stop offset="1" stopColor={goldColor} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Country fill */}
          <path
            d={LIBYA_PATH}
            fill="rgba(245,245,245,0.05)"
            stroke="rgba(245,245,245,0.18)"
            strokeWidth="1.2"
            opacity={interpolate(outlineProgress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" })}
          />

          {/* Country outline animating in */}
          <path
            d={LIBYA_PATH}
            fill="none"
            stroke="rgba(245,245,245,0.5)"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={1600}
            strokeDashoffset={(1 - outlineProgress) * 1600}
          />

          {/* Country label — sits in the southern interior (Sahara) */}
          <text
            x="300"
            y="245"
            textAnchor="middle"
            fontFamily={fonts.body}
            fontSize={language === "ar" ? "16" : "11"}
            fontWeight="600"
            fill="rgba(245,245,245,0.45)"
            letterSpacing={language === "ar" ? "1.5" : "5"}
            style={{ direction: language === "ar" ? "rtl" : "ltr" }}
            opacity={interpolate(outlineProgress, [0.6, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
          >
            {language === "ar" ? "ليبيا" : "LIBYA"}
          </text>

          {/* Sabha (interior reference) */}
          <circle
            cx={SABHA.x}
            cy={SABHA.y}
            r="3"
            fill="rgba(245,245,245,0.4)"
            opacity={interpolate(outlineProgress, [0.7, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
          />

          {/* Misrata (intermediate) */}
          <circle
            cx={MISRATA.x}
            cy={MISRATA.y}
            r="3"
            fill="rgba(245,245,245,0.4)"
            opacity={interpolate(outlineProgress, [0.7, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
          />

          {/* Route Tripoli → Benghazi */}
          <path
            d={`M ${TRIPOLI.x} ${TRIPOLI.y} Q ${ctrl.x} ${ctrl.y} ${BENGHAZI.x} ${BENGHAZI.y}`}
            fill="none"
            stroke="url(#route)"
            strokeWidth="2.5"
            strokeDasharray="5 7"
            strokeDashoffset={(1 - pathProgress) * -180}
            opacity={pathProgress > 0 ? 1 : 0}
          />

          {/* Tripoli (origin) */}
          <circle cx={TRIPOLI.x} cy={TRIPOLI.y} r="22" fill="url(#cityGlow)" />
          <circle cx={TRIPOLI.x} cy={TRIPOLI.y} r="6" fill={goldColor} />
          <circle cx={TRIPOLI.x} cy={TRIPOLI.y} r="11" fill="none" stroke={goldColor} strokeWidth="1.5" opacity="0.6" />
          <text
            x={TRIPOLI.x - 10}
            y={TRIPOLI.y - 16}
            textAnchor="end"
            fontFamily={fonts.body}
            fontSize="16"
            fontWeight="600"
            fill="#F5F5F5"
            style={{ direction: "ltr" }}
          >
            {language === "ar" ? "طرابلس" : "Tripoli"}
          </text>

          {/* Benghazi (destination) — pulses on arrival */}
          <circle
            cx={BENGHAZI.x}
            cy={BENGHAZI.y}
            r="22"
            fill="url(#cityGlow)"
            opacity={pathProgress > 0.95 ? 1 : 0.3}
          />
          <circle
            cx={BENGHAZI.x}
            cy={BENGHAZI.y}
            r="6"
            fill={goldColor}
            opacity={pathProgress > 0.95 ? 1 : 0.5}
          />
          <circle
            cx={BENGHAZI.x}
            cy={BENGHAZI.y}
            r="11"
            fill="none"
            stroke={goldColor}
            strokeWidth="1.5"
            opacity={pathProgress > 0.95 ? 0.7 : 0.25}
          />
          <text
            x={BENGHAZI.x + 14}
            y={BENGHAZI.y - 16}
            textAnchor="start"
            fontFamily={fonts.body}
            fontSize="16"
            fontWeight="600"
            fill="#F5F5F5"
            style={{ direction: "ltr" }}
          >
            {language === "ar" ? "بنغازي" : "Benghazi"}
          </text>

          {/* Truck — shown while in transit */}
          <g
            transform={`translate(${truckX}, ${truckY}) rotate(${truckAngle})`}
            opacity={pathProgress > 0.04 && pathProgress < 0.97 ? 1 : 0}
          >
            <g transform="translate(-18, -10)">
              <rect x="0" y="2" width="26" height="14" rx="2" fill="#F5F5F5" />
              <rect x="22" y="-3" width="12" height="11" rx="1.5" fill="#F5F5F5" />
              <rect x="24" y="-1" width="6" height="5" rx="0.8" fill="#0A0A0A" opacity="0.6" />
              <circle cx="6" cy="18" r="2.5" fill="#0A0A0A" />
              <circle cx="22" cy="18" r="2.5" fill="#0A0A0A" />
            </g>
          </g>
        </svg>
      </div>

      <div
        style={{
          opacity: subOpacity,
          fontFamily: fonts.body,
          fontSize: 28,
          fontWeight: 400,
          color: "rgba(245,245,245,0.7)",
          textAlign: "center",
          letterSpacing: 0.3,
          padding: "0 40px",
        }}
      >
        {t("delivery_sub", language)}
      </div>
    </AbsoluteFill>
  );
};
