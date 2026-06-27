// ===========================================================================
// perfumeSubmit.ts — روتين تثبيت إنشاء/تحديث العطر.
// دالة مساعدة غير متزامنة (async) خالصة (بلا React) مُستخرَجة من usePerfumes:
// تتحقّق من النموذج، تكتب صف `perfumes` الرئيسي، ثم تزامن الجداول الفرعية المرتبطة
// (الصور، العيّنات، أحجام القوارير) في Supabase.
// ===========================================================================
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Perfume, PerfumeSample, PerfumeBottleSize } from "../types";

/** كل ما تحتاجه submitPerfume: قيم النموذج، وهدف التحرير، وسلاسل الروائح الخام
 *  المفصولة بفواصل، ومصفوفات متغيّرات العيّنات/أحجام القوارير، وأي صور مخزّنة
 *  لعطر لم يُنشأ بعد، ودالة الرفع، ودالة الترجمة. */
interface SubmitArgs {
  formData: Omit<Perfume, "id" | "created_at" | "updated_at">;
  editingPerfume: Perfume | null;
  topNotes: string;
  middleNotes: string;
  baseNotes: string;
  perfumeSamples: PerfumeSample[];
  perfumeBottleSizes: PerfumeBottleSize[];
  pendingImages: File[];
  uploadPendingImages: (perfumeId: string) => Promise<void>;
  t: (key: string) => string;
}

/**
 * يثبّت عطرًا (إدراج عند الجديد، تحديث عند التحرير) إضافةً إلى جداول متغيّراته.
 * يتحقّق أولًا من الحقول المطلوبة وقواعد أحجام القوارير، ويبني حمولة قاعدة
 * البيانات (DB payload) (بتقسيم سلاسل الروائح إلى كائن JSON وفرض النوع "bottle"
 * عند تفعيل أحجام القوارير)، ثم عند التحرير يحذف صفوف العيّنات/أحجام القوارير
 * ويعيد إدراجها بحيث تطابق النموذج دائمًا. يُظهر كل خطوة عبر إشعارات toast.
 *
 * @param args - انظر SubmitArgs.
 * @returns true عند النجاح، وfalse عند فشل التحقق (يرمي استثناءً عند أخطاء Supabase).
 */
export async function submitPerfume(args: SubmitArgs): Promise<boolean> {
  const {
    formData,
    editingPerfume,
    topNotes,
    middleNotes,
    baseNotes,
    perfumeSamples,
    perfumeBottleSizes,
    pendingImages,
    uploadPendingImages,
    t,
  } = args;

  if (!formData.name || !formData.price || !formData.description) {
    toast.error(t("admin.toast.fillRequiredFields"));
    return false;
  }

  // التحقق من أحجام القوارير إذا كانت مفعّلة
  if (formData.has_bottle_sizes && perfumeBottleSizes.length > 0) {
    for (const bottleSize of perfumeBottleSizes) {
      if (!bottleSize.price || bottleSize.price <= 0) {
        toast.error(`${t("admin.toast.invalidPrice")} ${bottleSize.size}`);
        return false;
      }
      if (bottleSize.stock_quantity < 0) {
        toast.error(`${t("admin.toast.invalidStock")} ${bottleSize.size}`);
        return false;
      }
    }
  }

  // ضمان أن تكون عطور أحجام القوارير من النوع "bottle"
  if (formData.has_bottle_sizes && formData.type !== "bottle") {
    toast.error(t("admin.toast.bottleSizeTypeError"));
    return false;
  }

  // تحويل مدخلات الروائح المفصولة بفواصل إلى صيغة JSON التي يتوقّعها عمود قاعدة البيانات.
  const fragranceNotes = {
    top: topNotes.split(",").map((note) => note.trim()).filter(Boolean),
    middle: middleNotes.split(",").map((note) => note.trim()).filter(Boolean),
    base: baseNotes.split(",").map((note) => note.trim()).filter(Boolean),
  };

  const perfumeData = {
    ...formData,
    fragrance_notes: fragranceNotes,
    // ضمان أن يكون النوع bottle عند تفعيل أحجام القوارير
    type: formData.has_bottle_sizes ? "bottle" : formData.type,
  };

  // تحديث الصف الموجود عند التحرير، وإلا إدراج عطر جديد.
  // (تُعيد ‎.select()‎ الصف المتأثّر حتى نتمكن من قراءة المعرّف (id) المولَّد له.)
  let result;
  if (editingPerfume) {
    result = await supabase
      .from("perfumes")
      .update(perfumeData)
      .eq("id", editingPerfume.id)
      .select();
  } else {
    result = await supabase
      .from("perfumes")
      .insert([{ ...perfumeData, image: "dsf" }])
      .select();
  }

  if (result.error) throw result.error;

  console.log("Perfume created/updated:", result.data?.[0]);

  // بالنسبة لعطر جديد كليًا، خُزِّنت الصور محليًا (لم يكن هناك معرّف بعد)؛ والآن
  // بعد وجود الصف، تُرفع مقابل معرّفه (id) الجديد.
  if (!editingPerfume && pendingImages.length > 0 && result.data?.[0]?.id) {
    await uploadPendingImages(result.data[0].id);
  }

  // معالجة العيّنات
  if (
    formData.has_samples &&
    perfumeSamples.length > 0 &&
    result.data?.[0]?.id
  ) {
    const perfumeId = result.data[0].id;

    if (editingPerfume) {
      // الحذف ثم إعادة الإدراج يُبقي جدول العيّنات مرآةً مطابقة للنموذج (أبسط من
      // مقارنة الصفوف المضافة/المحذوفة/المعدّلة).
      const { error: deleteError } = await supabase
        .from("perfume_samples")
        .delete()
        .eq("perfume_id", perfumeId);

      if (deleteError) {
        console.error("Error deleting existing samples:", deleteError);
        toast.error(t("admin.toast.bottleSizesUpdateFailed"));
        return false;
      }
    }

    // إدراج/تحديث العيّنات
    const samplesToInsert = perfumeSamples.map((sample) => ({
      perfume_id: perfumeId,
      size: sample.size,
      price: sample.price,
      stock_quantity: sample.stock_quantity,
      is_active: sample.is_active,
    }));

    const { error: samplesError } = await supabase
      .from("perfume_samples")
      .insert(samplesToInsert);

    if (samplesError) {
      console.error("Error inserting samples:", samplesError);
      toast.error(t("admin.toast.samplesSaveFailed"));
    } else {
      console.log("Samples saved successfully:", samplesToInsert.length);
    }
  } else if (editingPerfume && !formData.has_samples) {
    // عند التحرير وتعطيل العيّنات، تُحذف كل العيّنات الموجودة
    const perfumeId = result.data?.[0]?.id;
    if (perfumeId) {
      const { error: deleteError } = await supabase
        .from("perfume_samples")
        .delete()
        .eq("perfume_id", perfumeId);

      if (deleteError) {
        console.error("Error deleting samples:", deleteError);
        toast.error(t("admin.toast.samplesRemoveFailed"));
      }
    }
  }

  // معالجة أحجام القوارير
  console.log("Bottle size handling debug:", {
    has_bottle_sizes: formData.has_bottle_sizes,
    perfumeBottleSizes_length: perfumeBottleSizes.length,
    perfumeBottleSizes: perfumeBottleSizes,
    result_data_id: result.data?.[0]?.id,
  });

  if (
    formData.has_bottle_sizes &&
    perfumeBottleSizes.length > 0 &&
    result.data?.[0]?.id
  ) {
    const perfumeId = result.data[0].id;

    if (editingPerfume) {
      // نفس استراتيجية المرآة المتّبعة مع العيّنات: مسح أحجام القوارير الموجودة، ثم إعادة الإدراج.
      const { error: deleteError } = await supabase
        .from("perfume_bottle_sizes")
        .delete()
        .eq("perfume_id", perfumeId);

      if (deleteError) {
        console.error("Error deleting existing bottle sizes:", deleteError);
        toast.error(t("admin.toast.bottleSizesUpdateFailed"));
        return false;
      }
    }

    // إدراج/تحديث أحجام القوارير
    const bottleSizesToInsert = perfumeBottleSizes.map((bottleSize) => ({
      perfume_id: perfumeId,
      size: bottleSize.size,
      price: bottleSize.price,
      stock_quantity: bottleSize.stock_quantity,
      is_active: bottleSize.is_active,
    }));

    console.log("Attempting to insert bottle sizes:", bottleSizesToInsert);

    const { data: insertedBottleSizes, error: bottleSizesError } =
      await supabase
        .from("perfume_bottle_sizes")
        .insert(bottleSizesToInsert)
        .select();

    if (bottleSizesError) {
      console.error("Error inserting bottle sizes:", bottleSizesError);
      toast.error(t("admin.toast.bottleSizesSaveFailed"));
    } else {
      console.log("Bottle sizes created successfully:", insertedBottleSizes);
      toast.success(
        `${insertedBottleSizes?.length || 0} ${t("admin.toast.bottleSizesSaved")}`
      );
    }
  } else if (editingPerfume && !formData.has_bottle_sizes) {
    // عند التحرير وتعطيل أحجام القوارير، تُحذف كل أحجام القوارير الموجودة
    const perfumeId = result.data?.[0]?.id;
    if (perfumeId) {
      const { error: deleteError } = await supabase
        .from("perfume_bottle_sizes")
        .delete()
        .eq("perfume_id", perfumeId);

      if (deleteError) {
        console.error("Error deleting bottle sizes:", deleteError);
        toast.error(t("admin.toast.bottleSizesRemoveFailed"));
      }
    }
  } else if (formData.has_bottle_sizes && perfumeBottleSizes.length === 0) {
    console.warn("Bottle sizes enabled but no bottle sizes provided");
    toast.warning(t("admin.toast.bottleSizesNoSizes"));
  } else {
    console.log("Bottle sizes not handled because:", {
      has_bottle_sizes: formData.has_bottle_sizes,
      perfumeBottleSizes_length: perfumeBottleSizes.length,
      has_result_id: !!result.data?.[0]?.id,
    });
  }

  toast.success(
    editingPerfume
      ? t("admin.toast.perfumeUpdatedSuccess")
      : t("admin.toast.perfumeCreatedSuccess")
  );
  return true;
}
