import { ChevronRight, ChevronLeft } from "lucide-react";
import { GiftCustomization, GiftOccasion, GiftBoxColor, GiftWrappingStyle } from "@/types/giftBuilder";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: GiftCustomization;
  onChange: (value: GiftCustomization) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function GiftStep3Customize({ value, onChange, onNext, onBack }: Props) {
  const { t, isRTL } = useLanguage();

  const set = <K extends keyof GiftCustomization>(key: K, val: GiftCustomization[K]) =>
    onChange({ ...value, [key]: val });

  const occasions: { value: GiftOccasion; label: string }[] = [
    { value: "birthday", label: t("giftBuilder.occasionBirthday") },
    { value: "eid", label: t("giftBuilder.occasionEid") },
    { value: "anniversary", label: t("giftBuilder.occasionAnniversary") },
    { value: "wedding", label: t("giftBuilder.occasionWedding") },
    { value: "valentine", label: t("giftBuilder.occasionValentine") },
    { value: "just_because", label: t("giftBuilder.occasionJustBecause") },
  ];

  const boxColors: { value: GiftBoxColor; hex: string; label: string }[] = [
    { value: "black", hex: "#1a1a1a", label: t("giftBuilder.colorBlack") },
    { value: "gold", hex: "#D4AF37", label: t("giftBuilder.colorGold") },
    { value: "white", hex: "#f0f0f0", label: t("giftBuilder.colorWhite") },
    { value: "rose_gold", hex: "#B76E79", label: t("giftBuilder.colorRoseGold") },
  ];

  const wrappings: { value: GiftWrappingStyle; label: string }[] = [
    { value: "ribbon", label: t("giftBuilder.wrappingRibbon") },
    { value: "luxury_tissue", label: t("giftBuilder.wrappingTissue") },
    { value: "luxury_bag", label: t("giftBuilder.wrappingBag") },
  ];

  return (
    <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
      <div className="text-center">
        <h2 className="text-2xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-2">
          {t("giftBuilder.step3Title")}
        </h2>
      </div>

      {/* Occasion */}
      <div>
        <Label className="dark:text-white/80 text-[#6B7B8D] mb-2 block font-medium">
          {t("giftBuilder.occasion")}
        </Label>
        <div className="flex flex-wrap gap-2">
          {occasions.map((o) => (
            <button
              key={o.value}
              onClick={() => set("occasion", o.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                value.occasion === o.value
                  ? "bg-[#5B8DD9] text-white border-[#5B8DD9]"
                  : "glass dark:border-white/10 border-[#323D50]/10 dark:text-white/70 text-[#6B7B8D] hover:border-[#5B8DD9]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Box Color */}
      <div>
        <Label className="dark:text-white/80 text-[#6B7B8D] mb-2 block font-medium">
          {t("giftBuilder.boxColor")}
        </Label>
        <div className="flex gap-3 items-center">
          {boxColors.map((c) => (
            <button
              key={c.value}
              onClick={() => set("boxColor", c.value)}
              title={c.label}
              className={`w-10 h-10 rounded-full border-4 transition-all hover:scale-110 ${
                value.boxColor === c.value
                  ? "border-[#5B8DD9] scale-110"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      {/* Wrapping */}
      <div>
        <Label className="dark:text-white/80 text-[#6B7B8D] mb-2 block font-medium">
          {t("giftBuilder.wrapping")}
        </Label>
        <div className="flex flex-wrap gap-2">
          {wrappings.map((w) => (
            <button
              key={w.value}
              onClick={() => set("wrappingStyle", w.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                value.wrappingStyle === w.value
                  ? "bg-[#5B8DD9] text-white border-[#5B8DD9]"
                  : "glass dark:border-white/10 border-[#323D50]/10 dark:text-white/70 text-[#6B7B8D] hover:border-[#5B8DD9]"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipient Name */}
      <div>
        <Label className="dark:text-white/80 text-[#6B7B8D] mb-2 block font-medium">
          {t("giftBuilder.recipientName")}
        </Label>
        <Input
          value={value.recipientName}
          onChange={(e) => set("recipientName", e.target.value)}
          placeholder={t("giftBuilder.recipientNamePlaceholder")}
          className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50]"
          dir={isRTL ? "rtl" : "ltr"}
        />
      </div>

      {/* Delivery Date */}
      <div>
        <Label className="dark:text-white/80 text-[#6B7B8D] mb-2 block font-medium">
          {t("giftBuilder.deliveryDate")}
        </Label>
        <Input
          type="date"
          value={value.deliveryDate}
          onChange={(e) => set("deliveryDate", e.target.value)}
          className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50]"
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      {/* Message Card */}
      <div>
        <Label className="dark:text-white/80 text-[#6B7B8D] mb-2 block font-medium">
          {t("giftBuilder.messageCard")}
        </Label>
        <Textarea
          value={value.messageCard}
          onChange={(e) => set("messageCard", e.target.value)}
          placeholder={t("giftBuilder.messageCardPlaceholder")}
          maxLength={300}
          rows={3}
          className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] resize-none"
          dir={isRTL ? "rtl" : "ltr"}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-3 px-4 rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
        >
          <ChevronLeft className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
          {t("giftBuilder.back")}
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white py-3 px-4 rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
        >
          {t("giftBuilder.step3Next")}
          <ChevronRight className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}
