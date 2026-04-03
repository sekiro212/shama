import { Sparkles, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  isLoading: boolean;
}

const CHIP_KEYS = [
  "giftBuilder.chip1",
  "giftBuilder.chip2",
  "giftBuilder.chip3",
  "giftBuilder.chip4",
  "giftBuilder.chip5",
];

export default function GiftStep1Describe({ value, onChange, onNext, isLoading }: Props) {
  const { t, isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-2">
          {t("giftBuilder.step1Title")}
        </h2>
        <p className="dark:text-white/60 text-[#6B7B8D]">
          {t("giftBuilder.step1Subtitle")}
        </p>
      </div>

      <textarea
        className="w-full glass-card rounded-2xl p-4 dark:text-[#F5F5F5] text-[#323D50] dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 resize-none focus:outline-none focus:ring-2 focus:ring-[#5B8DD9] text-base"
        rows={4}
        placeholder={t("giftBuilder.step1Placeholder")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={isRTL ? "rtl" : "ltr"}
      />

      <div className="flex flex-wrap gap-2">
        {CHIP_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => onChange(t(key))}
            className="glass px-4 py-2 rounded-full text-sm dark:text-white/70 text-[#6B7B8D] dark:border-white/10 border-[#323D50]/10 border hover:bg-[#5B8DD9]/10 transition-colors"
          >
            {t(key)}
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!value.trim() || isLoading}
        className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            {t("giftBuilder.findingProducts")}
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            {t("giftBuilder.step1Next")}
            <ChevronRight className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
          </>
        )}
      </button>
    </div>
  );
}
