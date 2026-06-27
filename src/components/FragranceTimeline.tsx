/**
 * FragranceTimeline.tsx
 * ---------------------------------------------------------------------------
 * أداة تفاعلية تعرض "كيف يتطور العطر مع مرور الوقت" داخل صفحة المنتج (ProductPage).
 * يُطلق العطر رائحته على ثلاث مراحل — النوتات العليا (top) أولاً، ثم نوتات القلب
 * (middle)، ثم النوتات الأساسية (base). يعرض هذا المكوّن هذه المراحل الثلاث على
 * مسار متحرك. الضغط على نقطة/بطاقة مرحلة يوسّع وصفاً مكتوباً بالذكاء الاصطناعي
 * يشرح كيف تكون رائحة تلك المرحلة.
 *
 * ثنائي اللغة: التسميات والأوقات لها نسخ عربية، ومواضع النقاط تُعكَس عندما تكون
 * الواجهة من اليمين إلى اليسار (RTL).
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateTimelineDescriptions } from "@/services/aiService";

interface FragranceTimelineProps {
  productName: string;
  /** نوتات العطر مجمّعة حسب المرحلة (بالإنجليزية). */
  notes: { top: string[]; middle: string[]; base: string[] };
  /** ترجمة عربية اختيارية للنوتات، تُعرض عندما تكون language === "ar". */
  notesAr?: { top: string[]; middle: string[]; base: string[] };
}

type PhaseKey = "top" | "middle" | "base";

// إعداد ثابت للمراحل الثلاث: تسمية ثنائية اللغة + النافذة الزمنية التقريبية التي
// تكون فيها كل مرحلة محسوسة، إضافةً إلى موضع نقطتها على المسار.
const PHASES: {
  key: PhaseKey;
  label: string;
  labelAr: string;
  time: string;
  timeAr: string;
  dotPosition: string;
}[] = [
  {
    key: "top",
    label: "Top Notes",
    labelAr: "النوتات الأولى",
    time: "0 – 30 min",
    timeAr: "٠ – ٣٠ دقيقة",
    dotPosition: "10%",
  },
  {
    key: "middle",
    label: "Heart Notes",
    labelAr: "نوتات القلب",
    time: "30 min – 2 hrs",
    timeAr: "٣٠ د – ساعتين",
    dotPosition: "50%",
  },
  {
    key: "base",
    label: "Base Notes",
    labelAr: "النوتات الأساسية",
    time: "2 hrs+",
    timeAr: "٢ ساعات+",
    dotPosition: "90%",
  },
];

/**
 * يعرض الخط الزمني المتحرك للمراحل الثلاث لعطر واحد.
 * @param productName - اسم المنتج، يُمرَّر للذكاء الاصطناعي لتوليد أوصاف المراحل
 * @param notes - النوتات الإنجليزية لكل مرحلة
 * @param notesAr - النوتات العربية الاختيارية لكل مرحلة
 */
export default function FragranceTimeline({
  productName,
  notes,
  notesAr,
}: FragranceTimelineProps) {
  const { isRTL, language } = useLanguage();
  // أي بطاقة/نقطة مرحلة موسَّعة حالياً (null = كل المراحل مطوية).
  const [activePhase, setActivePhase] = useState<PhaseKey | null>(null);
  // النص المولَّد بالذكاء الاصطناعي الذي يصف كل مرحلة؛ يبقى null حتى يكتمل الجلب.
  const [descriptions, setDescriptions] = useState<{
    top: string;
    middle: string;
    base: string;
  } | null>(null);

  // اعرض النوتات العربية فقط عندما تكون العربية مفعّلة وتوجد ترجمة مُمرَّرة.
  const displayNotes =
    language === "ar" && notesAr ? notesAr : notes;

  // اجلب أوصاف المراحل من الذكاء الاصطناعي كلما تغيّر المنتج أو اللغة.
  // يحمي المتغيّر `cancelled` من قيام استجابة متأخرة بتحديث مكوّن أُزيل من الشجرة
  // (أو من طلب قديم بعد أن بدّل المستخدم المنتج/اللغة).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const desc = await generateTimelineDescriptions(
        productName,
        notes,
        language
      );
      if (!cancelled) setDescriptions(desc);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productName, language]);

  return (
    <div className="py-6 px-2">
      {/* Shimmer track */}
      <div className="relative h-1 bg-[#5B8DD9]/20 rounded-full mb-10 mx-4 overflow-visible">
        {/* Travelling shimmer */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-[#5B8DD9] to-transparent rounded-full"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ width: "40%" }}
        />

        {/* Phase dots */}
        {PHASES.map((phase) => (
          <button
            key={phase.key}
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all duration-300 cursor-pointer ${
              activePhase === phase.key
                ? "border-[#5B8DD9] bg-[#5B8DD9] scale-125"
                : "border-[#5B8DD9] bg-white dark:bg-[#1a2235] hover:scale-125"
            }`}
            style={{
              // اعكس الموضع الأفقي للنقطة في وضع RTL ليُقرأ المسار من اليمين
              // إلى اليسار (مثال: 10% تصبح 90%).
              left: isRTL
                ? `${100 - parseInt(phase.dotPosition)}%`
                : phase.dotPosition,
              transform: "translate(-50%, -50%)",
            }}
            // تبديل: الضغط على المرحلة المفعّلة يطويها، وإلا يفتحها.
            onClick={() =>
              setActivePhase(activePhase === phase.key ? null : phase.key)
            }
            aria-label={isRTL ? phase.labelAr : phase.label}
          />
        ))}
      </div>

      {/* Phase cards grid */}
      <div className="grid grid-cols-3 gap-3">
        {PHASES.map((phase) => {
          const isActive = activePhase === phase.key;
          const phaseNotes = displayNotes[phase.key];

          return (
            <motion.button
              key={phase.key}
              className={`text-start p-4 rounded-xl border transition-all duration-300 cursor-pointer w-full ${
                isActive
                  ? "border-[#5B8DD9]/70 bg-[#5B8DD9]/10 shadow-lg shadow-[#5B8DD9]/20"
                  : "border-white/10 dark:border-white/10 bg-white/5 hover:border-[#5B8DD9]/40"
              }`}
              onClick={() =>
                setActivePhase(isActive ? null : phase.key)
              }
              animate={{ scale: isActive ? 1.02 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="text-xs font-semibold text-[#5B8DD9] mb-0.5">
                {isRTL ? phase.labelAr : phase.label}
              </div>
              <div className="text-xs text-[#6B7B8D] mb-3">
                {isRTL ? phase.timeAr : phase.time}
              </div>

              {/* اعرض أول 3 نوتات فقط كرقائق؛ والبقية تُختصر في شارة "N+" */}
              <div className="flex flex-wrap gap-1 mb-2">
                {phaseNotes.slice(0, 3).map((note) => (
                  <span
                    key={note}
                    className="text-xs bg-[#5B8DD9]/15 text-[#F5F5F5] px-2 py-0.5 rounded-full"
                  >
                    {note}
                  </span>
                ))}
                {phaseNotes.length > 3 && (
                  <span className="text-xs text-[#6B7B8D]">
                    +{phaseNotes.length - 3}
                  </span>
                )}
              </div>

              {/* وصف الذكاء الاصطناعي ينفتح بحركة (height 0 ← auto) للمرحلة المفعّلة فقط */}
              <AnimatePresence>
                {isActive && descriptions && (
                  <motion.p
                    key="desc"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-[#6B7B8D] italic leading-relaxed mt-1"
                  >
                    {descriptions[phase.key]}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
