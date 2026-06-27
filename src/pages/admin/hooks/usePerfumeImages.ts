/**
 * usePerfumeImages.ts
 *
 * hook للبيانات والتعديلات يدير معرض الصور لعطر واحد في نموذج منتج الإدارة.
 * يتعامل مع سيرين:
 *  - تعديل عطر موجود: تُرفع الصور مباشرةً إلى Supabase Storage.
 *  - إنشاء عطر جديد: تُخزَّن الصور مؤقتًا في `pendingImages` ولا تُرفع
 *    إلا بعد وجود صف العطر (انظر uploadPendingImages).
 * كما يدعم حذف صورة واختيار الصورة الأساسية.
 */
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  uploadPerfumeImage,
  deletePerfumeImage,
  getPerfumeImages,
  setPrimaryImage,
  validateImageFile,
  PerfumeImage,
} from "@/services/imageService";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Perfume } from "../types";
import { useConfirmDialog } from "./useConfirmDialog";

interface UsePerfumeImagesOptions {
  editingPerfume: Perfume | null;
  reloadPerfumes: () => Promise<void> | void;
}

/**
 * hook يدير معرض صور عطر في نموذج الإدارة.
 * @param editingPerfume  العطر الجاري تعديله، أو null عند إنشاء عطر جديد.
 * @param reloadPerfumes  دالة استدعاء لتحديث قائمة العطور الأب بعد أي تغيير
 *                        في المعرض (كي تبقى الصور المصغّرة متزامنة).
 * @returns حالة المعرض، ورايات الانشغال، وref حقل الملف، ومعالجات
 *          الرفع/الحذف/تعيين الأساسية إضافةً إلى props نافذة التأكيد.
 */
export function usePerfumeImages({
  editingPerfume,
  reloadPerfumes,
}: UsePerfumeImagesOptions) {
  const { t } = useLanguage();
  const { confirm, confirmDialogProps } = useConfirmDialog();
  // الصور المحفوظة بالفعل في Storage للعطر الجاري تعديله.
  const [perfumeImages, setPerfumeImages] = useState<PerfumeImage[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  // مخزن مؤقت للملفات المختارة أثناء إنشاء عطر لم يُحفظ بعد.
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  // معرّفات الانشغال لكل صورة من أجل إجراءات تعيين الأساسية / الحذف.
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // جلب المعرض المحفوظ لعطر من بيانات Supabase Storage الوصفية.
  const loadPerfumeImages = async (perfumeId: string) => {
    try {
      const images = await getPerfumeImages(perfumeId);
      setPerfumeImages(images);
    } catch (error) {
      console.error("Error loading perfume images:", error);
    }
  };

  // معالجة الملفات المختارة من حقل الملف — تتفرّع بين الإنشاء والتعديل.
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // إذا كان يجري تعديل عطر موجود، تُرفع الصور مباشرةً
    if (editingPerfume) {
      const perfumeId = editingPerfume.id;
      setImageUploading(true);

      // التحقّق من الصحّة ثم رفع كل ملف مختار بالتوازي.
      const uploadPromises = Array.from(files).map(async (file) => {
        const validationError = validateImageFile(file);
        if (validationError) {
          toast.error(validationError);
          return null;
        }

        const isPrimary = perfumeImages.length === 0; // الصورة الأولى هي الأساسية
        return await uploadPerfumeImage(perfumeId, file, isPrimary);
      });

      try {
        const results = await Promise.all(uploadPromises);
        // إسقاط قيم null (إخفاقات التحقّق) لعدّ عمليات الرفع الفعلية فقط.
        const successfulUploads = results.filter(Boolean) as PerfumeImage[];

        if (successfulUploads.length > 0) {
          // إعادة مزامنة معرض هذا العطر والصور المصغّرة في القائمة الأب.
          await loadPerfumeImages(perfumeId);
          await reloadPerfumes(); // تحديث قائمة العطور
        }
      } catch (error) {
        console.error("Error uploading images:", error);
        toast.error(t("admin.toast.imageUploadFailed"));
      } finally {
        setImageUploading(false);
      }
    } else {
      // إذا كان يجري إنشاء عطر جديد، تُخزَّن الصور مؤقتًا
      // التحقّق مسبقًا؛ تُخزَّن الملفات الصالحة فقط لرفعها لاحقًا.
      const validFiles = Array.from(files).filter((file) => {
        const validationError = validateImageFile(file);
        if (validationError) {
          toast.error(validationError);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        // الإضافة إلى المخزن المؤقت المعلّق؛ ويُؤجَّل الرفع الفعلي.
        setPendingImages((prev) => [...prev, ...validFiles]);
        toast.success(
          `${validFiles.length} ${t("admin.toast.imagesReadyToUpload")}`
        );
      }
    }
  };

  // دفع الصور المخزّنة مؤقتًا إلى Storage بمجرّد وجود صف العطر الجديد.
  // يُستدعى من perfumeSubmit بعد أن يُرجع إدراج العطر معرّفه (id).
  const uploadPendingImages = async (perfumeId: string) => {
    if (pendingImages.length === 0) return;

    setImageUploading(true);
    const uploadPromises = pendingImages.map(async (file, index) => {
      const isPrimary = index === 0; // الصورة الأولى هي الأساسية
      return await uploadPerfumeImage(perfumeId, file, isPrimary);
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(Boolean) as PerfumeImage[];

      if (successfulUploads.length > 0) {
        toast.success(
          `${successfulUploads.length} ${t("admin.toast.imagesUploadedSuccess")}`
        );
      }
    } catch (error) {
      console.error("Error uploading pending images:", error);
      toast.error(t("admin.toast.imageUploadFailed"));
    } finally {
      setImageUploading(false);
    }
  };

  // إسقاط صورة واحدة مخزّنة مؤقتًا (لم تُرفع بعد) من سير الإنشاء.
  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // حذف صورة محفوظة (بعد التأكيد)، ثم تحديث المعرض + القائمة.
  const handleImageDelete = async (imageId: string) => {
    // التأكيد قبل إزالة الصورة من Storage.
    const confirmed = await confirm({
      title: t("admin.confirmDialog.deleteImage.title"),
      description: t("admin.confirm.deleteImage"),
      confirmLabel: t("admin.confirmDialog.delete"),
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      setDeletingImage(imageId);
      const success = await deletePerfumeImage(imageId);
      if (success && editingPerfume) {
        // إعادة مزامنة المعرض والصور المصغّرة الأب بعد حذف ناجح.
        await loadPerfumeImages(editingPerfume.id);
        await reloadPerfumes(); // Refresh perfumes list
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    } finally {
      setDeletingImage(null);
    }
  };

  // تعيين صورة كالصورة الأساسية للعطر، ثم التحديث.
  const handleSetPrimaryImage = async (imageId: string) => {
    try {
      setSettingPrimary(imageId);
      const success = await setPrimaryImage(imageId);
      if (success && editingPerfume) {
        // إعادة التحميل كي تنعكس راية الأساسية الجديدة في كل مكان.
        await loadPerfumeImages(editingPerfume.id);
        await reloadPerfumes(); // Refresh perfumes list
      }
    } catch (error) {
      console.error("Error setting primary image:", error);
    } finally {
      setSettingPrimary(null);
    }
  };

  // مسح حالة الصور المحفوظة والمعلّقة معًا (يُستخدم عند إعادة ضبط النموذج).
  const resetImages = () => {
    setPerfumeImages([]);
    setPendingImages([]);
  };

  return {
    perfumeImages,
    imageUploading,
    pendingImages,
    settingPrimary,
    deletingImage,
    fileInputRef,
    loadPerfumeImages,
    handleImageUpload,
    uploadPendingImages,
    removePendingImage,
    handleImageDelete,
    handleSetPrimaryImage,
    resetImages,
    confirmDialogProps,
  };
}
