/**
 * ===========================================================================
 * الملف: KineticText.tsx
 * الدور: مكوّن متحرّك (animated component) لكشف العناوين بحركة ديناميكية.
 * يُظهر النصّ بحركة صعود من خلف قناع مقصوص (translateY)، بنمطين: "rise" يكشف
 * الكتلة كاملة دفعة واحدة، و"words" يكشف الكلمات كلمةً كلمة بتأخّر متدرّج،
 * مع دعم اتجاه القراءة العربي (RTL).
 * ===========================================================================
 */
import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

// خصائص المكوّن.
type Props = {
  children: string;
  // لحظة بدء الكشف (إطار نسبةً إلى الـ Sequence المحيط).
  delay?: number;
  // "rise" يكشف الكتلة كاملة بقناع صاعد؛ "words" يكشف الكلمات واحدة تلو الأخرى.
  mode?: "rise" | "words";
  // مقدار التأخّر بين كل كلمة وأختها (بالإطارات) في نمط "words".
  stagger?: number;
  rtl?: boolean; // هل النصّ من اليمين لليسار (للعربية)
  style?: React.CSSProperties;
};

// كشف فخم للعناوين يعتمد على قناع مقصوص + صعود translateY (وليس شفافية لكل حرف،
// التزاماً بإرشادات Remotion لتحريك النصوص). نمط "words" يكشف الكلمات بترتيب
// القراءة لإحساس حركيّ جذّاب.
// Premium headline reveal. Uses an overflow-clipped mask + translateY rise (never
// per-character opacity, per Remotion's text-animation guidance). "words" mode
// staggers each word in reading order for a kinetic, viral-feeling entrance.
/** يكشف النصّ بحركة صعود، إمّا ككتلة واحدة أو كلمةً كلمة حسب mode. */
export const KineticText: React.FC<Props> = ({
  children,
  delay = 0,
  mode = "rise",
  stagger = 4,
  rtl = false,
  style,
}) => {
  const frame = useCurrentFrame(); // الإطار الحالي
  const { fps } = useVideoConfig(); // معدّل الإطارات اللازم لدالة spring

  // نمط "words": تقسيم النصّ إلى كلمات وكشف كلٍّ منها بتأخّر متدرّج.
  if (mode === "words") {
    const words = children.split(" ");
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          flexDirection: rtl ? "row-reverse" : "row", // عكس اتجاه الصفّ في العربية
          ...style,
        }}
      >
        {words.map((word, i) => {
          // نابض (spring) لكل كلمة، مزاحٌ بمقدار delay + (ترتيب الكلمة × stagger)
          // لينتج تتابع الكشف كلمةً بعد كلمة.
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
                  // الكلمة تصعد من الأسفل (100%) إلى موضعها (0%) مع تقدّم النابض p.
                  transform: `translateY(${(1 - p) * 100}%)`,
                  opacity: p,
                  // الحفاظ على المسافة بين الكلمات
                  // keep the inter-word space
                  whiteSpace: "pre",
                }}
              >
                {word}
                {/* إضافة مسافة بعد كل كلمة عدا الأخيرة */}
                {i < words.length - 1 ? " " : ""}
              </span>
            </span>
          );
        })}
      </div>
    );
  }

  // نمط "rise": كشف الكتلة كاملة دفعة واحدة بقناع صاعد.
  // "rise" — single upward mask reveal for the whole block.
  // نابض واحد للكتلة كلها، مزاحٌ بمقدار delay.
  const p = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.8 },
  });
  // الشفافية تكتمل في أول 60% من النابض كي يظهر النصّ أسرع من اكتمال الصعود.
  const opacity = interpolate(p, [0, 0.6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em" }}>
      <div
        style={{
          transform: `translateY(${(1 - p) * 100}%)`, // صعود الكتلة من الأسفل إلى موضعها
          opacity,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
};
