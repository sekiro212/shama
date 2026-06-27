/**
 * ===========================================================================
 * مشهد الاختبار (Quiz Scene)
 * ---------------------------------------------------------------------------
 * مشهد من الفيديو الإعلاني (Remotion) يحاكي اختبار تحديد العطر المفضّل داخل
 * إطار هاتف (PhoneFrame). يطرح سؤالاً مع أربعة خيارات (منعش/دافئ/عود/زهري)
 * تظهر بالتتابع، ثم تُحاكى نقرة المستخدم على خيار "الدافئ" (نبضة)، ويتقدّم
 * شريط التقدّم، وأخيراً يتلاشى المشهد للخروج. يرافقه مقطع صوتي خاص بالمشهد.
 * الهدف: عرض ميزة الاختبار التفاعلي لاقتراح العطر المناسب.
 * ===========================================================================
 */
import { AbsoluteFill, Audio, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { dir, isRtl, t, type Lang } from "../i18n";
import { getFonts } from "../fonts";
import { PhoneFrame } from "../components/PhoneFrame";
import { sceneAudio } from "../audio";

type Props = {
  language: Lang;
  goldColor: string;
  primaryColor: string;
};

/**
 * مكوّن مشهد الاختبار.
 * props: اللغة واللونان الذهبي والأساسي للعلامة.
 */
export const QuizScene: React.FC<Props> = ({ language, goldColor, primaryColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);

  // ظهور العنوان: تلاشٍ تدريجي مع انزلاق رأسي للأعلى (بمنحنى تباطؤ تكعيبي)
  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 18], [22, 0], { extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3) });

  // حركة دخول إطار الهاتف بدءاً من الإطار 8
  const phoneEnter = spring({
    frame: frame - 8,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.8 },
  });

  // توقيتات المشهد بالإطارات:
  const tileEnterStart = 24; // بدء ظهور خيارات الإجابة
  const tapFrame = 70;       // لحظة محاكاة نقرة المستخدم على الخيار
  const progressStart = 76;  // بدء امتلاء شريط التقدّم
  const progressEnd = 100;   // اكتمال شريط التقدّم
  const progress = interpolate(frame, [progressStart, progressEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // تلاشي خروج المشهد بأكمله بين الإطارين 108 و120
  const exitOpacity = interpolate(frame, [108, 120], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // خيارات الإجابة الأربعة، لكلٍّ منها مفتاح ونص (مترجم) ولون مميّز
  const options: Array<{ key: "warm" | "fresh" | "oud" | "floral"; label: string; tone: string }> = [
    { key: "fresh", label: t("quiz_opt_fresh", language), tone: "#7BB6E6" },
    { key: "warm", label: t("quiz_opt_warm", language), tone: goldColor },
    { key: "oud", label: t("quiz_opt_oud", language), tone: "#9B6B3F" },
    { key: "floral", label: t("quiz_opt_floral", language), tone: "#D9A8C8" },
  ];

  // الخيار الذي ستحاكي الرسومُ اختياره (الدافئ)
  const selectedKey = "warm";

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
      {/* المقطع الصوتي الخاص بمشهد الاختبار */}
      <Audio src={sceneAudio("quiz", language)} volume={0.95} />

      {/* عنوان المشهد — يظهر مع انزلاق رأسي عبر titleOpacity وtitleY */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontFamily: fonts.display,
          fontSize: 64,
          fontWeight: isRtl(language) ? 800 : 700,
          color: "#F5F5F5",
          textAlign: "center",
          marginBottom: 50,
          padding: "0 40px",
          lineHeight: 1.15,
          letterSpacing: isRtl(language) ? 0 : -0.5,
        }}
      >
        {t("quiz_title", language)}
      </div>

      {/* حاوية إطار الهاتف — تظهر وتتكبّر قليلاً عبر phoneEnter */}
      <div
        style={{
          opacity: phoneEnter,
          transform: `translateY(${(1 - phoneEnter) * 30}px) scale(${0.94 + phoneEnter * 0.06})`,
        }}
      >
        <PhoneFrame width={460}>
          <div
            style={{
              padding: "76px 30px 30px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 24,
              direction: dir(language),
            }}
          >
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 16,
                fontWeight: 600,
                color: goldColor,
                letterSpacing: 2,
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              {t("ai_label", language)}
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 32,
                fontWeight: 700,
                color: "#F5F5F5",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {t("quiz_q", language)}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginTop: 12,
              }}
            >
              {options.map((opt, i) => {
                // كل خيار يدخل بتأخير 6 إطارات عن سابقه (تأثير التتابع)
                const tileEnter = spring({
                  frame: frame - tileEnterStart - i * 6,
                  fps,
                  config: { damping: 18, stiffness: 110, mass: 0.6 },
                });
                // يُعدّ الخيار "محدّداً" إذا كان هو الخيار المستهدف وبعد لحظة النقرة
                const isSelected = opt.key === selectedKey && frame >= tapFrame;
                // نبضة عند النقر (spring قليل التخميد لإحساس الارتداد)
                const tapPulse = isSelected
                  ? spring({
                      frame: frame - tapFrame,
                      fps,
                      config: { damping: 10, stiffness: 200, mass: 0.5 },
                    })
                  : 0;
                const scale = isSelected ? 1 + tapPulse * 0.04 : 1; // تكبير طفيف للخيار المحدّد
                return (
                  <div
                    key={opt.key}
                    style={{
                      opacity: tileEnter,
                      transform: `translateY(${(1 - tileEnter) * 12}px) scale(${scale})`,
                      aspectRatio: "1/1",
                      background: isSelected
                        ? `linear-gradient(135deg, ${opt.tone}33 0%, ${opt.tone}10 100%)`
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isSelected ? opt.tone : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: fonts.body,
                      fontSize: 24,
                      fontWeight: 600,
                      color: isSelected ? "#F5F5F5" : "rgba(245,245,245,0.85)",
                    }}
                  >
                    {opt.label}
                  </div>
                );
              })}
            </div>

            {/* شريط التقدّم (مسار الاختبار) — يُثبّت اتجاهه LTR */}
            <div
              style={{
                marginTop: "auto",
                width: "100%",
                height: 6,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 999,
                overflow: "hidden",
                direction: "ltr",
              }}
            >
              {/* الجزء الممتلئ — يتمدّد عرضه بحسب قيمة progress */}
              <div
                style={{
                  width: `${progress * 100}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${primaryColor} 0%, ${goldColor} 100%)`,
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
};
