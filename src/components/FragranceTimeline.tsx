import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateTimelineDescriptions } from "@/services/aiService";

interface FragranceTimelineProps {
  productName: string;
  notes: { top: string[]; middle: string[]; base: string[] };
  notesAr?: { top: string[]; middle: string[]; base: string[] };
}

type PhaseKey = "top" | "middle" | "base";

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

export default function FragranceTimeline({
  productName,
  notes,
  notesAr,
}: FragranceTimelineProps) {
  const { isRTL, language } = useLanguage();
  const [activePhase, setActivePhase] = useState<PhaseKey | null>(null);
  const [descriptions, setDescriptions] = useState<{
    top: string;
    middle: string;
    base: string;
  } | null>(null);

  const displayNotes =
    language === "ar" && notesAr ? notesAr : notes;

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
                : "border-[#5B8DD9] bg-[#1a2235] hover:scale-125"
            }`}
            style={{ left: phase.dotPosition, transform: "translate(-50%, -50%)" }}
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

              {isActive && descriptions && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-[#6B7B8D] italic leading-relaxed mt-1"
                >
                  {descriptions[phase.key]}
                </motion.p>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
