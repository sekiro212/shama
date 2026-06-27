// ===========================================================================
// ImagesSection.tsx — قسم فرعي لمعرض صور نافذة نموذج العطر.
// عرضي فقط (presentational): يعرض زر الرفع + شبكة الصور المصغّرة ويُبلِّغ عن
// إجراءات المستخدم عبر دوال رد النداء (callbacks). يتعامل مع وضعين — التحرير يعرض
// الصور المرفوعة مسبقًا (مع تعيين-أساسية/حذف)، أما الإنشاء فيعرض الملفات "المعلّقة"
// المخزّنة محليًا التي لا تُرفع إلا بعد حفظ العطر.
// ===========================================================================
import { RefObject } from "react";
import { Upload, Image as ImageIcon, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PerfumeImage } from "@/services/imageService";
import type { Perfume } from "../../types";

interface ImagesSectionProps {
  editingPerfume: Perfume | null;
  perfumeImages: PerfumeImage[];
  imageUploading: boolean;
  pendingImages: File[];
  settingPrimary: string | null;
  deletingImage: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  handleImageUpload: (files: FileList | null) => void;
  removePendingImage: (index: number) => void;
  handleImageDelete: (imageId: string) => void;
  handleSetPrimaryImage: (imageId: string) => void;
}

/**
 * يعرض معرض صور العطر داخل نافذة النموذج.
 * الخصائص (props) الأساسية:
 * - editingPerfume: عند تعيينه، تُعرض `perfumeImages` المحفوظة؛ وإلا تُعرض
 *   `pendingImages` المخزّنة محليًا لعطر لم يُنشأ بعد
 * - fileInputRef + handleImageUpload: توصيل حقل ملفات مخفي لاختيار الملفات
 * - handleSetPrimaryImage / handleImageDelete / removePendingImage: إجراءات لكل
 *   صورة مصغّرة؛ وتُشغّل settingPrimary / deletingImage / imageUploading مؤشّرات الانشغال
 * كل منطق الرفع/الحذف موجود في الـ hook usePerfumeImages — وهذا للعرض فقط.
 */
export function ImagesSection({
  editingPerfume,
  perfumeImages,
  imageUploading,
  pendingImages,
  settingPrimary,
  deletingImage,
  fileInputRef,
  handleImageUpload,
  removePendingImage,
  handleImageDelete,
  handleSetPrimaryImage,
}: ImagesSectionProps) {
  const { t, isRTL } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-[#323D50] dark:text-white/80">
          <ImageIcon className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"} inline`} />
          {t("admin.images.perfumeImages")}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={imageUploading}
          className="border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10"
        >
          <Upload className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
          {imageUploading
            ? t("admin.images.uploading")
            : t("admin.images.addImages")}
        </Button>
      </div>

      {/* حقل ملفات أصلي مخفي، يُطلَق عبر زر "إضافة صور" المرئي. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleImageUpload(e.target.files)}
        className="hidden"
      />

      {/* عرض الصور الموجودة عند التحرير */}
      {editingPerfume && perfumeImages.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {perfumeImages.map((image) => (
            <div
              key={image.id}
              className="relative group bg-white dark:bg-white/5 rounded-lg p-2 border border-[#323D50]/10 dark:border-white/10"
            >
              <img
                src={image.image_url}
                alt={image.image_name}
                className="w-full h-24 object-cover rounded-md"
              />

              {image.is_primary && (
                <div className={`absolute top-1 ${isRTL ? "right-1" : "left-1"} bg-[#5B8DD9] text-white px-2 py-1 rounded-full text-xs flex items-center`}>
                  <Star className={`w-3 h-3 ${isRTL ? "ms-1" : "me-1"}`} />
                  {t("admin.images.primary")}
                </div>
              )}

              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {!image.is_primary && (
                  <LoadingButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetPrimaryImage(image.id)}
                    loading={settingPrimary === image.id}
                    loadingText=""
                    className="h-6 w-6 p-0 bg-[#5B8DD9] hover:bg-[#3E6BB5] border-none"
                    title={t("admin.images.setAsPrimary")}
                  >
                    <Star className="w-3 h-3" />
                  </LoadingButton>
                )}
                <LoadingButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleImageDelete(image.id)}
                  loading={deletingImage === image.id}
                  loadingText=""
                  className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 border-none"
                  title={t("admin.images.deleteImage")}
                >
                  <Trash2 className="w-3 h-3" />
                </LoadingButton>
              </div>

              <div className="mt-2 text-xs text-[#6B7B8D] dark:text-white/60 text-center truncate">
                {image.image_name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* عرض الصور المعلّقة لعطر جديد */}
      {!editingPerfume && pendingImages.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {pendingImages.map((file, index) => (
            <div
              key={index}
              className="relative group bg-white dark:bg-white/5 rounded-lg p-2 border border-[#323D50]/10 dark:border-white/10"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-24 object-cover rounded-md"
              />

              {/* معاينة من رابط كائن (object URL) في الذاكرة؛ أول ملف معلّق هو الأساسي. */}
              {index === 0 && (
                <div className={`absolute top-1 ${isRTL ? "right-1" : "left-1"} bg-[#5B8DD9] text-white px-2 py-1 rounded-full text-xs flex items-center`}>
                  <Star className={`w-3 h-3 ${isRTL ? "ms-1" : "me-1"}`} />
                  {t("admin.images.primary")}
                </div>
              )}

              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removePendingImage(index)}
                  className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 border-none"
                  title={t("admin.images.removeImage")}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              <div className="mt-2 text-xs text-[#6B7B8D] dark:text-white/60 text-center truncate">
                {file.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* رسالة عدم وجود صور */}
      {((editingPerfume && perfumeImages.length === 0) ||
        (!editingPerfume && pendingImages.length === 0)) && (
        <div className="text-center py-8 text-[#6B7B8D] dark:text-white/40">
          <ImageIcon className="w-12 h-12 mx-auto mb-2" />
          <p>
            {editingPerfume
              ? t("admin.images.noImagesUploaded")
              : t("admin.images.noImagesSelected")}
          </p>
          <p className="text-xs">
            {editingPerfume
              ? t("admin.images.clickAddToUpload")
              : t("admin.images.clickAddToSelect")}
          </p>
        </div>
      )}
    </div>
  );
}
