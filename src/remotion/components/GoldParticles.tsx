/**
 * ===========================================================================
 * الملف: GoldParticles.tsx
 * الدور: مكوّن متحرّك (animated component) يرسم جسيمات ذهبية طافية.
 * يولّد تسع نقاط ضوئية ذهبية بمواقع وأحجام شبه عشوائية لكنها ثابتة (حتمية)،
 * وتطفو ببطء للأعلى مع تلاشٍ في الدخول والخروج لإضفاء لمسة فخمة على الخلفية.
 * ===========================================================================
 */
import { useCurrentFrame, interpolate } from "remotion";

// قائمة الجسيمات المحسوبة مسبقاً بصيغة حتمية (تعتمد على الفهرس i فقط) كي تتطابق
// في كل تصيير: الموقع (x,y)، الحجم، تأخير الظهور، اتجاه الانجراف، والشفافية.
const PARTICLES = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  x: ((i * 53 + 17) % 100), // موقع أفقي بالنسبة المئوية (توزيع شبه عشوائي ثابت)
  y: ((i * 37 + 11) % 100), // موقع رأسي بالنسبة المئوية
  size: 1.5 + (i % 4) * 0.8, // حجم متغيّر للجسيم
  delay: (i * 7) % 40, // تأخير بدء حركة كل جسيم بالإطارات
  driftX: ((i % 5) - 2) * 15, // مقدار الانجراف الأفقي
  driftY: -20 - (i % 6) * 10, // مقدار الانجراف الرأسي (سالب = للأعلى)
  opacity: 0.3 + (i % 4) * 0.15, // أقصى شفافية يبلغها الجسيم
}));

// خصائص المكوّن: مدّة المشهد المضيف بالإطارات لضبط توقيت الظهور والاختفاء.
type Props = {
  durationInFrames: number;
};

/** يرسم طبقة الجسيمات الذهبية الطافية فوق خلفية المشهد. */
export const GoldParticles: React.FC<Props> = ({ durationInFrames }) => {
  const frame = useCurrentFrame(); // الإطار الحالي لحساب الحركة لحظياً

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
        // الإطار المحلّي للجسيم بعد طرح تأخيره الخاص (لا يقلّ عن صفر).
        const localFrame = Math.max(0, frame - p.delay);
        // نسبة التقدّم من 0 إلى 1 عبر عمر الجسيم.
        const progress = localFrame / (durationInFrames - p.delay);

        // شفافية تتلاشى دخولاً (أول 20 إطاراً) وخروجاً (آخر 20 إطاراً) عبر interpolate.
        const opacity = interpolate(
          localFrame,
          [0, 20, durationInFrames - p.delay - 20, durationInFrames - p.delay],
          [0, p.opacity, p.opacity, 0],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
        );

        // الموقع الرأسي ينجرف تدريجياً من y نحو y + الانجراف الرأسي.
        const y = interpolate(
          progress,
          [0, 1],
          [p.y, p.y + p.driftY / 10],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
        );

        // الموقع الأفقي ينجرف انجرافاً طفيفاً مع التقدّم.
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
              backgroundColor: "#D4AF37", // اللون الذهبي للجسيم
              opacity,
              boxShadow: `0 0 ${p.size * 2}px rgba(212, 175, 55, 0.8)`, // هالة ضوئية حول الجسيم
            }}
          />
        );
      })}
    </div>
  );
};
