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
import type { PerfumeBottleSize } from "../../types";

interface BottleSizesSectionProps {
  hasBottleSizes: boolean;
  onHasBottleSizesChange: (value: boolean) => void;
  perfumeBottleSizes: PerfumeBottleSize[];
  bottleSizes: string[];
  addBottleSize: () => void;
  removeBottleSize: (index: number) => void;
  updateBottleSize: (
    index: number,
    field: keyof PerfumeBottleSize,
    value: any
  ) => void;
}

export function BottleSizesSection({
  hasBottleSizes,
  onHasBottleSizesChange,
  perfumeBottleSizes,
  bottleSizes,
  addBottleSize,
  removeBottleSize,
  updateBottleSize,
}: BottleSizesSectionProps) {
  const { t, isRTL } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="has_bottle_sizes"
          checked={hasBottleSizes}
          onChange={(e) => onHasBottleSizesChange(e.target.checked)}
          className="rounded border-[#323D50]/15 dark:border-white/20 bg-white/5"
        />
        <Label htmlFor="has_bottle_sizes" className="text-[#323D50] dark:text-white/80">
          {t("admin.bottleSizes.hasBottleSizeVariants")}
        </Label>
      </div>

      {hasBottleSizes && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[#323D50] dark:text-white/80">
              {t("admin.bottleSizes.bottleSizeVariants")}
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBottleSize}
              className="border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10"
            >
              <Plus className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.bottleSizes.addBottleSize")}
            </Button>
          </div>

          {perfumeBottleSizes.length > 0 ? (
            <div className="space-y-3">
              {perfumeBottleSizes.map((bottleSize, index) => (
                <div
                  key={index}
                  className="grid grid-cols-4 gap-3 p-3 bg-white dark:bg-white/5 rounded-lg border border-[#323D50]/10 dark:border-white/10"
                >
                  <Select
                    value={bottleSize.size}
                    onValueChange={(value) =>
                      updateBottleSize(index, "size", value)
                    }
                  >
                    <SelectTrigger className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                      {bottleSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    step="0.01"
                    value={bottleSize.price}
                    onChange={(e) =>
                      updateBottleSize(
                        index,
                        "price",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                    placeholder={t("admin.bottleSizes.pricePlaceholder")}
                  />

                  <Input
                    type="number"
                    value={bottleSize.stock_quantity}
                    onChange={(e) =>
                      updateBottleSize(
                        index,
                        "stock_quantity",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                    placeholder={t("admin.bottleSizes.stockPlaceholder")}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeBottleSize(index)}
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
              <p>{t("admin.bottleSizes.noBottleSizesYet")}</p>
              <p className="text-xs">
                {t("admin.bottleSizes.clickAddBottleSize")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
