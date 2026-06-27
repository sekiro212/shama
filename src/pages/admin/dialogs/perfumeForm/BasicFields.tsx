/**
 * BasicFields.tsx
 * ---------------
 * Perfume-form subsection holding the core product fields: bilingual name (EN/AR),
 * price, bilingual description (with one-click AI generation), size, type, gender,
 * stock quantity and rating. Every input is controlled and reports changes through
 * `handleInputChange(field, value)`, which maps directly to columns on the perfumes table.
 */
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

interface BasicFieldsProps {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
  handleGenerateDescription: () => void;
  generatingDescription: boolean;
}

/**
 * Renders the core perfume input fields.
 * Key props:
 * - formData: the current perfume form values
 * - handleInputChange: updates a single field on the form state
 * - handleGenerateDescription: calls the AI service to draft the EN description
 * - generatingDescription: loading flag for the AI generate button
 */
export function BasicFields({
  formData,
  handleInputChange,
  handleGenerateDescription,
  generatingDescription,
}: BasicFieldsProps) {
  const { t, isRTL } = useLanguage();

  return (
    <>
      {/* English Name + Arabic Name */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[#323D50] dark:text-white/80">
            {t("admin.form.name")} (EN) *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
            placeholder={t("admin.form.enterPerfumeName")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name_ar" className="text-[#323D50] dark:text-white/80">
            {t("admin.form.name")} (AR)
          </Label>
          <Input
            id="name_ar"
            dir="rtl"
            value={formData.name_ar}
            onChange={(e) => handleInputChange("name_ar", e.target.value)}
            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
            placeholder="اسم العطر بالعربية"
          />
        </div>
      </div>

      {/* Price */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price" className="text-[#323D50] dark:text-white/80">
            {t("admin.form.price")} *
          </Label>
          {/* Price stored as a float; parsed from the numeric text input. */}
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) =>
              handleInputChange("price", parseFloat(e.target.value))
            }
            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
            placeholder={t("admin.form.enterPrice")}
          />
        </div>
      </div>

      {/* English Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description" className="text-[#323D50] dark:text-white/80">
            {t("admin.form.description")} (EN) *
          </Label>
          <LoadingButton
            type="button"
            size="sm"
            onClick={handleGenerateDescription}
            loading={generatingDescription}
            loadingText={t("admin.form.generating")}
            className="h-7 px-3 text-xs bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0"
          >
            <Sparkles className={`w-3 h-3 ${isRTL ? "ms-1" : "me-1"}`} />
            {t("admin.form.generateWithAI")}
          </LoadingButton>
        </div>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
          placeholder={t("admin.form.enterDescription")}
          rows={3}
        />
      </div>

      {/* Arabic Description */}
      <div className="space-y-2">
        <Label htmlFor="description_ar" className="text-[#323D50] dark:text-white/80">
          {t("admin.form.description")} (AR)
        </Label>
        <Textarea
          id="description_ar"
          dir="rtl"
          value={formData.description_ar}
          onChange={(e) =>
            handleInputChange("description_ar", e.target.value)
          }
          className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
          placeholder="وصف العطر بالعربية"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="size" className="text-[#323D50] dark:text-white/80">
            {t("admin.form.size")}
          </Label>
          <Input
            id="size"
            value={formData.size}
            onChange={(e) => handleInputChange("size", e.target.value)}
            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
            placeholder={t("admin.form.sizePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type" className="text-[#323D50] dark:text-white/80">
            {t("admin.form.type")}
          </Label>
          <Select
            value={formData.type}
            onValueChange={(value: any) => handleInputChange("type", value)}
          >
            <SelectTrigger className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
              <SelectItem value="bottle">
                {t("admin.form.typeSingle")}
              </SelectItem>
              <SelectItem value="sample">
                {t("admin.form.typeSample")}
              </SelectItem>
              <SelectItem value="gift">{t("admin.form.typeGift")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gender" className="text-[#323D50] dark:text-white/80">
            {t("admin.form.gender")}
          </Label>
          <Select
            value={formData.gender}
            onValueChange={(value: any) => handleInputChange("gender", value)}
          >
            <SelectTrigger className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
              <SelectItem value="men">{t("admin.form.men")}</SelectItem>
              <SelectItem value="women">{t("admin.form.women")}</SelectItem>
              <SelectItem value="unisex">{t("admin.form.unisex")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stock_quantity" className="text-[#323D50] dark:text-white/80">
            {t("admin.form.stockQuantity")}
          </Label>
          <Input
            id="stock_quantity"
            type="number"
            value={formData.stock_quantity}
            onChange={(e) =>
              handleInputChange("stock_quantity", parseInt(e.target.value))
            }
            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
            placeholder={t("admin.form.enterStockQuantity")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rating" className="text-[#323D50] dark:text-white/80">
            {t("admin.form.rating")}
          </Label>
          <Input
            id="rating"
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={formData.rating}
            onChange={(e) =>
              handleInputChange("rating", parseFloat(e.target.value))
            }
            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
            placeholder={t("admin.form.enterRating")}
          />
        </div>
      </div>
    </>
  );
}
