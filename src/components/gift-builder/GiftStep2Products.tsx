/**
 * ====================================================================
 * GiftStep2Products — الخطوة الثانية من معالج بناء الهدية
 * --------------------------------------------------------------------
 * تعرض قائمة العطور التي اقترحها الذكاء الاصطناعي بناءً على وصف الخطوة
 * الأولى، وتتيح للمستخدم اختيار حتى أربعة عطور (4 كحد أقصى) لتكوين الهدية.
 * تدعم اللغتين العربية والإنجليزية مع اتجاه RTL عبر useLanguage().
 * ====================================================================
 */
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import { Product } from "@/services/productsService";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * خصائص المكوّن:
 * - products: العطور المقترحة من AI لعرضها للاختيار.
 * - selected: العطور المختارة حاليًا (مُدارة من المكوّن الأب).
 * - onToggle: إضافة/إزالة عطر من قائمة الاختيار عند النقر.
 * - onNext / onBack: التنقّل بين خطوات المعالج.
 */
interface Props {
  products: Product[];
  selected: Product[];
  onToggle: (product: Product) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * المكوّن الرئيسي لخطوة اختيار العطور ضمن الهدية.
 */
export default function GiftStep2Products({ products, selected, onToggle, onNext, onBack }: Props) {
  const { t, isRTL } = useLanguage();

  // دالة مساعدة: تتحقّق ممّا إذا كان العطر مُدرَجًا ضمن العطور المختارة
  const isSelected = (p: Product) => selected.some((s) => s.id === p.id);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-2">
          {t("giftBuilder.step2Title")}
        </h2>
        <p className="dark:text-white/60 text-[#6B7B8D]">
          {t("giftBuilder.step2Subtitle")} ({selected.length}/4)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-80 overflow-y-auto pr-1">
        {products.map((product) => {
          const sel = isSelected(product);
          // تعطيل العطور غير المختارة عند بلوغ الحد الأقصى (4 عطور)
          const disabled = !sel && selected.length >= 4;
          return (
            <button
              key={product.id}
              onClick={() => !disabled && onToggle(product)}
              disabled={disabled}
              className={`glass-card p-4 rounded-2xl text-start transition-all duration-200 border-2 ${
                sel
                  ? "border-[#5B8DD9] bg-[#5B8DD9]/10"
                  : "border-transparent hover:border-[#5B8DD9]/40"
              } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]"}`}
            >
              <div className="flex items-start gap-3">
                {product.images?.[0]?.image_url && (
                  <img
                    src={product.images[0].image_url}
                    alt={product.name}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold dark:text-[#F5F5F5] text-[#323D50] truncate text-sm">
                    {product.name}
                  </p>
                  <p className="text-sm dark:text-white/60 text-[#6B7B8D]">
                    {product.price} LYD
                  </p>
                </div>
                {sel && (
                  <div className="flex-shrink-0 bg-[#5B8DD9] rounded-full p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* أزرار التنقّل: «رجوع» (سهمه يُقلَب في RTL) و«التالي» المُعطَّل
          ما لم يُختَر عطر واحد على الأقل */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-3 px-4 rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
        >
          <ChevronLeft className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
          {t("giftBuilder.back")}
        </button>
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="flex-1 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white py-3 px-4 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {t("giftBuilder.step2Next")}
          <ChevronRight className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}
