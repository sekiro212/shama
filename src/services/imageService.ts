/**
 * ===========================================================================
 * ملف: imageService.ts
 * الغرض: إدارة صور العطور في تخزين Supabase (حاوية perfume-images) وجدول perfume_images.
 * يوفّر عمليات: الرفع، الحذف، الجلب، تعيين الصورة الأساسية، تغيير الترتيب، والتحقق من الملفات.
 * ملاحظة: كل صورة لها سجل في الجدول يحمل بياناتها الوصفية (metadata) إضافة إلى الملف في التخزين.
 * ===========================================================================
 */
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface PerfumeImage {
  id: string;
  perfume_id: string;
  image_url: string;
  image_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * رفع صورة عطر إلى التخزين وحفظ بياناتها الوصفية في جدول perfume_images.
 * @param perfumeId معرّف العطر الذي تتبع له الصورة.
 * @param file ملف الصورة المراد رفعه.
 * @param isPrimary هل تُعيّن هذه الصورة كصورة أساسية للعطر (افتراضيًا false).
 * @returns سجل الصورة بعد الحفظ، أو null عند حدوث خطأ.
 */
export const uploadPerfumeImage = async (
  perfumeId: string,
  file: File,
  isPrimary: boolean = false
): Promise<PerfumeImage | null> => {
  try {
    // مسار الملف: مجلد باسم معرّف العطر + طابع زمني للتفرّد مع الحفاظ على الامتداد الأصلي
    const fileExt = file.name.split(".").pop();
    const fileName = `${perfumeId}/${Date.now()}.${fileExt}`;

    // رفع الملف إلى حاوية التخزين perfume-images
    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("perfume-images")
      .upload(fileName, file, {
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast.error("Failed to upload image");
      return null;
    }

    // الحصول على الرابط العام للصورة المرفوعة لتخزينه في الجدول
    const {
      data: { publicUrl },
    } = supabase.storage.from("perfume-images").getPublicUrl(fileName);

    // حساب ترتيب العرض: جلب أعلى ترتيب موجود لإسناد الترتيب التالي للصورة الجديدة
    const { data: existingImages, error: fetchError } = await supabase
      .from("perfume_images")
      .select("display_order")
      .eq("perfume_id", perfumeId)
      .order("display_order", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Error fetching existing images:", fetchError);
      // المتابعة بالترتيب الافتراضي عند فشل الجلب
    }

    // إن وُجدت صور سابقة يكون الترتيب = أعلى ترتيب + 1، وإلا 0 لأول صورة
    const displayOrder =
      existingImages && existingImages.length > 0
        ? existingImages[0].display_order + 1
        : 0;

    // عند تعيين هذه الصورة كأساسية، يجب إلغاء صفة "أساسية" عن بقية صور العطر أولًا
    if (isPrimary) {
      await supabase
        .from("perfume_images")
        .update({ is_primary: false })
        .eq("perfume_id", perfumeId);
    }

    // حفظ البيانات الوصفية للصورة (الرابط، الاسم، الحجم، النوع...) في جدول perfume_images
    const { data: imageData, error: dbError } = await supabase
      .from("perfume_images")
      .insert([
        {
          perfume_id: perfumeId,
          image_url: publicUrl,
          image_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          is_primary: isPrimary,
          display_order: displayOrder,
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // تنظيف الملف المرفوع إذا فشل الحفظ في قاعدة البيانات لتجنّب الملفات اليتيمة
      await supabase.storage.from("perfume-images").remove([fileName]);
      toast.error("Failed to save image metadata");
      return null;
    }

    // Note: We no longer update the main image field as we rely on uploaded images only

    toast.success("Image uploaded successfully");
    return imageData;
  } catch (error) {
    console.error("Error uploading image:", error);
    toast.error("Failed to upload image");
    return null;
  }
};

/**
 * حذف صورة عطر من التخزين ومن قاعدة البيانات معًا.
 * إذا كانت الصورة المحذوفة هي الأساسية، تُعيَّن أول صورة متبقية كصورة أساسية بديلة.
 * @param imageId معرّف الصورة المراد حذفها.
 * @returns true عند نجاح الحذف، أو false عند الفشل.
 */
export const deletePerfumeImage = async (imageId: string): Promise<boolean> => {
  try {
    // جلب بيانات الصورة أولًا للحصول على مسار الملف ومعرفة هل هي الأساسية
    const { data: imageData, error: fetchError } = await supabase
      .from("perfume_images")
      .select("*")
      .eq("id", imageId)
      .single();

    if (fetchError || !imageData) {
      console.error("Error fetching image data:", fetchError);
      toast.error("Failed to find image");
      return false;
    }

    // حذف الملف من التخزين باستخدام مساره المخزّن (file_path)
    const { error: storageError } = await supabase.storage
      .from("perfume-images")
      .remove([imageData.file_path]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
      toast.error("Failed to delete image from storage");
      return false;
    }

    // حذف سجل الصورة من قاعدة البيانات
    const { error: dbError } = await supabase
      .from("perfume_images")
      .delete()
      .eq("id", imageId);

    if (dbError) {
      console.error("Error deleting from database:", dbError);
      toast.error("Failed to delete image from database");
      return false;
    }

    // إذا كانت هذه هي الصورة الأساسية، تُعيَّن أول صورة متبقية (الأقل ترتيبًا) كأساسية جديدة
    if (imageData.is_primary) {
      const { data: otherImages, error: otherError } = await supabase
        .from("perfume_images")
        .select("*")
        .eq("perfume_id", imageData.perfume_id)
        .order("display_order", { ascending: true })
        .limit(1);

      if (!otherError && otherImages && otherImages.length > 0) {
        await supabase
          .from("perfume_images")
          .update({ is_primary: true })
          .eq("id", otherImages[0].id);

        // Note: We no longer update the main image field as we rely on uploaded images only
      }
    }

    toast.success("Image deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    toast.error("Failed to delete image");
    return false;
  }
};

/**
 * جلب جميع صور عطر معيّن مرتّبة تصاعديًا حسب ترتيب العرض (display_order).
 * @param perfumeId معرّف العطر.
 * @returns مصفوفة صور العطر، أو مصفوفة فارغة عند الخطأ.
 */
export const getPerfumeImages = async (
  perfumeId: string
): Promise<PerfumeImage[]> => {
  try {
    const { data, error } = await supabase
      .from("perfume_images")
      .select("*")
      .eq("perfume_id", perfumeId)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching perfume images:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching perfume images:", error);
    return [];
  }
};

/**
 * تعيين صورة محدّدة كصورة أساسية للعطر.
 * يلغي أولًا صفة "أساسية" عن كل صور العطر، ثم يضعها على الصورة المطلوبة (لضمان وجود صورة أساسية واحدة).
 * @param imageId معرّف الصورة المراد جعلها أساسية.
 * @returns true عند النجاح، أو false عند الفشل.
 */
export const setPrimaryImage = async (imageId: string): Promise<boolean> => {
  try {
    // جلب بيانات الصورة للحصول على معرّف العطر التابعة له
    const { data: imageData, error: fetchError } = await supabase
      .from("perfume_images")
      .select("*")
      .eq("id", imageId)
      .single();

    if (fetchError || !imageData) {
      console.error("Error fetching image data:", fetchError);
      toast.error("Failed to find image");
      return false;
    }

    // إلغاء صفة "أساسية" عن جميع صور العطر
    await supabase
      .from("perfume_images")
      .update({ is_primary: false })
      .eq("perfume_id", imageData.perfume_id);

    // تعيين الصورة المطلوبة كأساسية
    const { error: updateError } = await supabase
      .from("perfume_images")
      .update({ is_primary: true })
      .eq("id", imageId);

    if (updateError) {
      console.error("Error setting primary image:", updateError);
      toast.error("Failed to set primary image");
      return false;
    }

    // Note: We no longer update the main image field as we rely on uploaded images only

    toast.success("Primary image updated successfully");
    return true;
  } catch (error) {
    console.error("Error setting primary image:", error);
    toast.error("Failed to set primary image");
    return false;
  }
};

/**
 * تحديث ترتيب عرض صورة معيّنة.
 * @param imageId معرّف الصورة.
 * @param newOrder قيمة الترتيب الجديدة.
 * @returns true عند النجاح، أو false عند الفشل.
 */
export const updateImageOrder = async (
  imageId: string,
  newOrder: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("perfume_images")
      .update({ display_order: newOrder })
      .eq("id", imageId);

    if (error) {
      console.error("Error updating image order:", error);
      toast.error("Failed to update image order");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating image order:", error);
    toast.error("Failed to update image order");
    return false;
  }
};

/**
 * التحقق من صلاحية ملف الصورة قبل الرفع (النوع والحجم).
 * @param file الملف المراد التحقق منه.
 * @returns رسالة خطأ نصية عند المخالفة، أو null إذا كان الملف صالحًا.
 */
export const validateImageFile = (file: File): string | null => {
  const maxSize = 5 * 1024 * 1024; // الحد الأقصى للحجم: 5 ميغابايت
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  // رفض الأنواع غير المسموح بها
  if (!allowedTypes.includes(file.type)) {
    return "Only JPEG, PNG, and WebP images are allowed";
  }

  // رفض الملفات التي تتجاوز الحد الأقصى للحجم
  if (file.size > maxSize) {
    return "Image size must be less than 5MB";
  }

  return null;
};
