import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Perfume, PerfumeSample, PerfumeBottleSize } from "../types";

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

  // Validate bottle sizes if enabled
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

  // Ensure bottle size perfumes are type "bottle"
  if (formData.has_bottle_sizes && formData.type !== "bottle") {
    toast.error(t("admin.toast.bottleSizeTypeError"));
    return false;
  }

  const fragranceNotes = {
    top: topNotes.split(",").map((note) => note.trim()).filter(Boolean),
    middle: middleNotes.split(",").map((note) => note.trim()).filter(Boolean),
    base: baseNotes.split(",").map((note) => note.trim()).filter(Boolean),
  };

  const perfumeData = {
    ...formData,
    fragrance_notes: fragranceNotes,
    // Ensure type is bottle when bottle sizes are enabled
    type: formData.has_bottle_sizes ? "bottle" : formData.type,
  };

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

  // If creating a new perfume and there are pending images, upload them
  if (!editingPerfume && pendingImages.length > 0 && result.data?.[0]?.id) {
    await uploadPendingImages(result.data[0].id);
  }

  // Handle samples
  if (
    formData.has_samples &&
    perfumeSamples.length > 0 &&
    result.data?.[0]?.id
  ) {
    const perfumeId = result.data[0].id;

    if (editingPerfume) {
      // For editing: Delete existing samples first, then insert updated ones
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

    // Insert/update samples
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
    // If editing and samples are disabled, delete all existing samples
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

  // Handle bottle sizes
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
      // For editing: Delete existing bottle sizes first, then insert updated ones
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

    // Insert/update bottle sizes
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
    // If editing and bottle sizes are disabled, delete all existing bottle sizes
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
