// ===========================================================================
// SamplesSection.tsx — قسم فرعي لمتغيّرات أحجام العيّنات من نموذج العطر.
// عرضي فقط (presentational): مفتاح يُفعّل متغيّرات العيّنات، ثم يعرض قائمة قابلة
// للتحرير من صفوف {size, price, stock}. تُفوَّض كل تعديلات المصفوفة إلى دوال رد
// النداء add/remove/updateSample المملوكة للـ hook الخاص بـ usePerfumes.
// ===========================================================================
import { Plus, Trash2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PerfumeSample } from "../../types";

interface SamplesSectionProps {
  hasSamples: boolean;
  onHasSamplesChange: (value: boolean) => void;
  perfumeSamples: PerfumeSample[];
  sampleSizes: string[];
  addSample: () => void;
  removeSample: (index: number) => void;
  updateSample: (index: number, field: keyof PerfumeSample, value: any) => void;
}

/**
 * يعرض القائمة الاختيارية لمتغيّرات أحجام العيّنات لعطر ما.
 * الخصائص (props) الأساسية:
 * - hasSamples / onHasSamplesChange: مربّع الاختيار الرئيسي الذي يبدّل هذا القسم
 * - perfumeSamples: صفوف المتغيّرات الحالية (الحجم/السعر/المخزون)، صف محرّر لكلٍّ منها
 * - sampleSizes: خيارات الأحجام المسموح بها للقائمة المنسدلة (3ml–30ml)
 * - addSample / removeSample / updateSample: تعديل مصفوفة المتغيّرات في الأعلى
 */
export function SamplesSection({
  hasSamples,
  onHasSamplesChange,
  perfumeSamples,
  sampleSizes,
  addSample,
  removeSample,
  updateSample,
}: SamplesSectionProps) {
  const { t, isRTL } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="has_samples"
          checked={hasSamples}
          onChange={(e) => onHasSamplesChange(e.target.checked)}
          className="rounded border-[#323D50]/15 dark:border-white/20 bg-white/5"
        />
        <Label htmlFor="has_samples" className="text-[#323D50] dark:text-white/80">
          {t("admin.samples.hasSampleVariants")}
        </Label>
      </div>

      {/* لا يُعرض محرّر المتغيّرات إلا عند تفعيل متغيّرات العيّنات. */}
      {hasSamples && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[#323D50] dark:text-white/80">
              {t("admin.samples.sampleVariants")}
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSample}
              className="border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10"
            >
              <Plus className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.samples.addSample")}
            </Button>
          </div>

          {perfumeSamples.length > 0 ? (
            <div className="space-y-3">
              {perfumeSamples.map((sample, index) => (
                <div
                  key={index}
                  className="grid grid-cols-4 gap-3 p-3 bg-white dark:bg-white/5 rounded-lg border border-[#323D50]/10 dark:border-white/10"
                >
                  <Select
                    value={sample.size}
                    onValueChange={(value) =>
                      updateSample(index, "size", value)
                    }
                  >
                    <SelectTrigger className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                      {sampleSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    step="0.01"
                    value={sample.price}
                    onChange={(e) =>
                      updateSample(
                        index,
                        "price",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                    placeholder={t("admin.samples.pricePlaceholder")}
                  />

                  <Input
                    type="number"
                    value={sample.stock_quantity}
                    onChange={(e) =>
                      updateSample(
                        index,
                        "stock_quantity",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                    placeholder={t("admin.samples.stockPlaceholder")}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSample(index)}
                    className="border-red-500/20 text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-[#6B7B8D] dark:text-white/40">
              <Package className="w-8 h-8 mx-auto mb-2" />
              <p>{t("admin.samples.noSamplesYet")}</p>
              <p className="text-xs">{t("admin.samples.clickAddSample")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
