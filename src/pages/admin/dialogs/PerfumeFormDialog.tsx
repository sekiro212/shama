/**
 * PerfumeFormDialog.tsx
 * ---------------------
 * نموذج نافذة لإضافة عطر جديد أو تحرير عطر موجود (محرّر المنتجات الرئيسي
 * للمسؤول). وهو حاوية تجمع أربعة أقسام فرعية: BasicFields (الاسم/السعر/الوصف...)،
 * مدخلات روائح العطر (fragrance-notes)، وSamplesSection، وBottleSizesSection،
 * وImagesSection.
 * تأتي كل الحالة والمعالِجات من الـ hook `usePerfumes` (يُمرَّر باسم
 * `perfumesApi`)؛ وهذا المكوّن يربط تلك البيانات بالواجهة فحسب.
 */
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import type { usePerfumes } from "../hooks/usePerfumes";
import { BasicFields } from "./perfumeForm/BasicFields";
import { SamplesSection } from "./perfumeForm/SamplesSection";
import { BottleSizesSection } from "./perfumeForm/BottleSizesSection";
import { ImagesSection } from "./perfumeForm/ImagesSection";

interface PerfumeFormDialogProps {
  perfumesApi: ReturnType<typeof usePerfumes>;
}

/**
 * يعرض نافذة إنشاء/تحرير العطر.
 * الخاصية (prop) الأساسية:
 * - perfumesApi: ناتج الـ hook `usePerfumes` الكامل، يوفّر حالة النموذج، وحقول
 *   روائح العطر، ومصفوفات متغيّرات العيّنات/القوارير، ومعالِجات الصور، ومعالِج
 *   الإرسال.
 */
export function PerfumeFormDialog({ perfumesApi }: PerfumeFormDialogProps) {
  const { t, isRTL } = useLanguage();
  // استخراج كل بيانات النموذج ومعالِجات التعديل من الـ hook الخاص بالعطور.
  const {
    isDialogOpen,
    setIsDialogOpen,
    editingPerfume,
    formData,
    topNotes,
    setTopNotes,
    middleNotes,
    setMiddleNotes,
    baseNotes,
    setBaseNotes,
    perfumeSamples,
    sampleSizes,
    perfumeBottleSizes,
    bottleSizes,
    submitLoading,
    generatingDescription,
    handleInputChange,
    handleGenerateDescription,
    handleSubmit,
    addSample,
    removeSample,
    updateSample,
    addBottleSize,
    removeBottleSize,
    updateBottleSize,
    images,
  } = perfumesApi;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {editingPerfume
              ? t("admin.form.editPerfume")
              : t("admin.form.addNewPerfume")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <BasicFields
            formData={formData}
            handleInputChange={handleInputChange}
            handleGenerateDescription={handleGenerateDescription}
            generatingDescription={generatingDescription}
          />

          {/* روائح العطر: ثلاثة مدخلات نصية مفصولة بفواصل (عليا/وسطى/قاعدية)
              تُربَط بحقول هرم العطر (scent-pyramid) للعطر في قاعدة البيانات. */}
          <div className="space-y-4">
            <Label className="text-[#323D50] dark:text-white/80">
              {t("admin.form.fragranceNotes")}
            </Label>
            <div className="space-y-2">
              <Input
                value={topNotes}
                onChange={(e) => setTopNotes(e.target.value)}
                className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                placeholder={t("admin.form.topNotes")}
              />
              <Input
                value={middleNotes}
                onChange={(e) => setMiddleNotes(e.target.value)}
                className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                placeholder={t("admin.form.middleNotes")}
              />
              <Input
                value={baseNotes}
                onChange={(e) => setBaseNotes(e.target.value)}
                className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                placeholder={t("admin.form.baseNotes")}
              />
            </div>
          </div>

          <SamplesSection
            hasSamples={formData.has_samples}
            onHasSamplesChange={(value) =>
              handleInputChange("has_samples", value)
            }
            perfumeSamples={perfumeSamples}
            sampleSizes={sampleSizes}
            addSample={addSample}
            removeSample={removeSample}
            updateSample={updateSample}
          />

          <BottleSizesSection
            hasBottleSizes={formData.has_bottle_sizes}
            onHasBottleSizesChange={(value) =>
              handleInputChange("has_bottle_sizes", value)
            }
            perfumeBottleSizes={perfumeBottleSizes}
            bottleSizes={bottleSizes}
            addBottleSize={addBottleSize}
            removeBottleSize={removeBottleSize}
            updateBottleSize={updateBottleSize}
          />

          <ImagesSection
            editingPerfume={editingPerfume}
            perfumeImages={images.perfumeImages}
            imageUploading={images.imageUploading}
            pendingImages={images.pendingImages}
            settingPrimary={images.settingPrimary}
            deletingImage={images.deletingImage}
            fileInputRef={images.fileInputRef}
            handleImageUpload={images.handleImageUpload}
            removePendingImage={images.removePendingImage}
            handleImageDelete={images.handleImageDelete}
            handleSetPrimaryImage={images.handleSetPrimaryImage}
          />

          <div className="flex gap-2 pt-4">
            {/* زر الحفظ: يثبّت العطر (إدراج عند الإضافة، تحديث عند التحرير). */}
            <LoadingButton
              onClick={handleSubmit}
              loading={submitLoading}
              loadingText={
                editingPerfume
                  ? t("admin.form.updating")
                  : t("admin.form.creating")
              }
              className="flex-1 bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
            >
              <Save className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {editingPerfume ? t("admin.form.update") : t("admin.form.create")}
            </LoadingButton>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10"
            >
              <X className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.form.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
