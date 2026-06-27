/**
 * ===========================================================================
 * مشهد "الباحث الذكي" (AI Finder Scene)
 * ---------------------------------------------------------------------------
 * أحد مشاهد الفيديو الإعلاني المبنية برمجياً عبر Remotion.
 * يعرض هذا المشهد واجهة متصفح (BrowserChrome) لموقع shama.ly، حيث تظهر
 * عبارة بحث وكأنها تُكتب حرفاً بحرف (تأثير الكتابة) ثم تظهر نتائج المنتجات
 * المقترحة من الذكاء الاصطناعي على شكل بطاقات تتدرج في الظهور.
 * الهدف: إبراز ميزة البحث الذكي في المتجر.
 * ===========================================================================
 */
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";

const resolveAsset = (url: string) => (url.startsWith("/") ? staticFile(url.slice(1)) : url);
import { dir, isRtl, t, type Lang } from "../i18n";
import { getFonts } from "../fonts";
import { BrowserChrome } from "../components/BrowserChrome";
import { SceneBackdrop } from "../components/SceneBackdrop";
import type { Product } from "../schema";

type Props = {
  language: Lang;
  goldColor: string;
  primaryColor: string;
  products: Product[];
};

// الإطار (frame) الذي يبدأ عنده تأثير الكتابة
const TYPE_START = 16;
const TYPE_SPEED = 0.85; // عدد الحروف المكتوبة في كل إطار (chars per frame)

/**
 * مكوّن مشهد الباحث الذكي.
 * props: لغة العرض، اللون الذهبي واللون الأساسي للعلامة، وقائمة المنتجات
 * التي ستُعرض كنتائج بحث.
 */
export const AIFinderScene: React.FC<Props> = ({ language, goldColor, primaryColor, products }) => {
  // الإطار الحالي ضمن المشهد (يُستخدم كمحرّك لكل الحركات)
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = getFonts(language);
  const rtl = isRtl(language);

  // حركة دخول نافذة المتصفح باستخدام spring (ارتداد ناعم عند الظهور)
  const chromeEnter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.8 },
  });

  // تلاشي ظهور النص العلوي (الوسم) تدريجياً بين الإطارين 6 و22
  const labelOpacity = interpolate(frame, [6, 22], [0, 1], { extrapolateRight: "clamp" });

  // النص الكامل المراد كتابته، ثم حساب عدد الحروف الظاهرة حتى الآن بحسب الإطار
  const typed = t("ai_typed", language);
  const charsToShow = Math.max(0, Math.min(typed.length, Math.floor((frame - TYPE_START) * TYPE_SPEED)));
  const typedSubstring = typed.slice(0, charsToShow);
  const doneTyping = charsToShow >= typed.length; // هل اكتملت كتابة النص؟

  // وميض مؤشر الكتابة: يظهر ويختفي كل 8 إطارات
  const cursorVisible = Math.floor(frame / 8) % 2 === 0;

  // توقيت بدء ظهور بطاقات النتائج: بعد انتهاء الكتابة بأربعة إطارات
  const resultsStart = TYPE_START + Math.ceil(typed.length / TYPE_SPEED) + 4;

  return (
    <AbsoluteFill style={{ direction: dir(language) }}>
      {/* الخلفية المتحركة المشتركة لكل المشاهد */}
      <SceneBackdrop primaryColor={primaryColor} goldColor={goldColor} seed={2.7} intensity={1.05} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", direction: dir(language) }}>
      {/* النص العلوي (الوسم) — يتلاشى ظهوره عبر labelOpacity */}
      <div
        style={{
          opacity: labelOpacity,
          marginBottom: 28,
          fontFamily: fonts.body,
          fontSize: 24,
          fontWeight: 500,
          color: goldColor,
          letterSpacing: 2.5,
          textTransform: "uppercase",
        }}
      >
        {t("ai_label", language)}
      </div>

      {/* حاوية نافذة المتصفح — تنزلق للأعلى وتتكبّر قليلاً عند الدخول وفق chromeEnter */}
      <div
        style={{
          opacity: chromeEnter,
          transform: `translateY(${(1 - chromeEnter) * 30}px) scale(${0.96 + chromeEnter * 0.04})`,
        }}
      >
        <BrowserChrome url="shama.ly" fontFamily={fonts.body} width={920}>
          <div
            style={{
              padding: "44px 40px 56px",
              display: "flex",
              flexDirection: "column",
              gap: 32,
              minHeight: 540,
              direction: dir(language),
            }}
          >
            {/* صندوق البحث — يتوهّج إطاره بالذهبي عند اكتمال الكتابة (doneTyping) */}
            <div
              style={{
                position: "relative",
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${doneTyping ? goldColor + "66" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 18,
                padding: "22px 26px",
                display: "flex",
                flexDirection: rtl ? "row-reverse" : "row",
                alignItems: "center",
                gap: 18,
                transition: "border-color 0.3s",
                boxShadow: doneTyping ? `0 0 30px ${goldColor}22` : "none",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${goldColor} 100%)`,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  fontFamily: fonts.body,
                  fontSize: 28,
                  fontWeight: 400,
                  color: "rgba(245,245,245,0.95)",
                  letterSpacing: 0.2,
                  minHeight: 36,
                  textAlign: rtl ? "right" : "left",
                }}
              >
                {/* النص المكتوب حتى الآن */}
                {typedSubstring}
                {/* مؤشر الكتابة الوامض — يظهر فقط أثناء الكتابة (قبل اكتمالها) */}
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: 28,
                    background: goldColor,
                    marginInlineStart: 4,
                    verticalAlign: "middle",
                    opacity: !doneTyping && cursorVisible ? 1 : 0,
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(245,245,245,0.5)",
                  letterSpacing: 1.5,
                  padding: "6px 10px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 6,
                  direction: "ltr",
                }}
              >
                ⌘K
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
              }}
            >
              {/* بطاقات نتائج البحث (أول 3 منتجات) */}
              {products.slice(0, 3).map((p, i) => {
                // كل بطاقة تدخل بتأخير 7 إطارات عن سابقتها لتأثير التتابع (stagger)
                const cardEnter = spring({
                  frame: frame - resultsStart - i * 7,
                  fps,
                  config: { damping: 18, stiffness: 110, mass: 0.7 },
                });
                return (
                  <div
                    key={i}
                    style={{
                      opacity: cardEnter,
                      transform: `translateY(${(1 - cardEnter) * 20}px)`,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 14,
                      padding: 18,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: "4/5",
                        background: `linear-gradient(160deg, ${primaryColor}22 0%, ${goldColor}22 100%)`,
                        borderRadius: 10,
                        backgroundImage: `url(${resolveAsset(p.imageUrl)})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontSize: 22,
                        fontWeight: 600,
                        color: "#F5F5F5",
                        textAlign: rtl ? "right" : "left",
                      }}
                    >
                      {p.name[language]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </BrowserChrome>
      </div>

      {/* التعليق الختامي أسفل النافذة — يظهر بعد استقرار النتائج */}
      <div
        style={{
          opacity: interpolate(frame, [resultsStart + 20, resultsStart + 34], [0, 1], { extrapolateRight: "clamp" }),
          marginTop: 36,
          fontFamily: fonts.body,
          fontSize: 28,
          fontWeight: 400,
          color: "rgba(245,245,245,0.7)",
          textAlign: "center",
          letterSpacing: 0.3,
          padding: "0 40px",
        }}
      >
        {t("ai_caption", language)}
      </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
