/**
 * ===========================================================================
 * الملف: LightSweep.tsx
 * الدور: مكوّن متحرّك (animated component) يرسم ومضة ضوء مائلة عابرة.
 * يحرّك شريط ضوء لامع قطرياً عبر العنصر الأب مرّة واحدة لمحاكاة انعكاس الضوء
 * على الزجاج. يتطلّب أن يكون الأب position:relative مع إخفاء الفائض، ولا يرسم
 * شيئاً قبل بدء التأخير أو بعد انتهاء العبور.
 * ===========================================================================
 */
import { useCurrentFrame, interpolate, Easing } from "remotion";

// خصائص المكوّن.
type Props = {
  // لحظة بدء الومضة (إطار نسبةً إلى الـ Sequence المحيط).
  delay?: number;
  duration?: number; // مدّة عبور الومضة بالإطارات
  color?: string; // لون شريط الضوء
  // عرض شريط الإضاءة المتحرّك كنسبة مئوية من عرض الأب.
  bandWidth?: number;
};

// انعكاس ضوئي قطري يعبر العنصر الأب مرّة واحدة — توقيع "الضوء يلامس الزجاج" الفخم.
// يجب أن يكون الأب position:relative مع overflow مخفي (أو قصّ عبر غلاف). لا يرسم
// شيئاً قبل delay أو بعد خروجه.
// A diagonal specular highlight that travels across the parent once — the premium
// "light catches the glass" signature. Parent must be position:relative + overflow
// hidden (or clip via a wrapper). Renders nothing before `delay` / after it exits.
/** يرسم شريط ضوء مائلاً يعبر العنصر الأب مرّة واحدة بحركة سلسة. */
export const LightSweep: React.FC<Props> = ({
  delay = 0,
  duration = 26,
  color = "rgba(255,255,255,0.45)",
  bandWidth = 30,
}) => {
  const frame = useCurrentFrame();
  const local = frame - delay; // الإطار المحلّي بعد طرح التأخير
  // لا نرسم شيئاً خارج نافذة العبور (قبل البداية أو بعد النهاية).
  if (local < 0 || local > duration) return null;

  // يتحرّك الشريط من خارج الحافة اليسرى إلى خارج الحافة اليمنى، بتسارع/تباطؤ تكعيبي.
  // Travel from off the left edge to off the right edge.
  const x = interpolate(local, [0, duration], [-bandWidth - 10, 110], {
    easing: Easing.inOut(Easing.cubic), // منحنى حركة ناعم في البداية والنهاية
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
          transform: "skewX(-18deg)", // إمالة الشريط ليبدو الانعكاس قطرياً
          // تدرّج لوني: شفاف على الطرفين ولامع في الوسط ليبدو كشعاع ضوء
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          mixBlendMode: "screen", // مزج "screen" ليضيء ما تحته بدل أن يحجبه
        }}
      />
    </div>
  );
};
