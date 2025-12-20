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

// Upload image to Supabase Storage and save metadata to database
export const uploadPerfumeImage = async (
  perfumeId: string,
  file: File,
  isPrimary: boolean = false
): Promise<PerfumeImage | null> => {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${perfumeId}/${Date.now()}.${fileExt}`;

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

    // Get public URL for the uploaded image
    const {
      data: { publicUrl },
    } = supabase.storage.from("perfume-images").getPublicUrl(fileName);

    // Get display order (next available order)
    const { data: existingImages, error: fetchError } = await supabase
      .from("perfume_images")
      .select("display_order")
      .eq("perfume_id", perfumeId)
      .order("display_order", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Error fetching existing images:", fetchError);
      // Continue with default order
    }

    const displayOrder =
      existingImages && existingImages.length > 0
        ? existingImages[0].display_order + 1
        : 0;

    // If this is set as primary, update other images to not be primary
    if (isPrimary) {
      await supabase
        .from("perfume_images")
        .update({ is_primary: false })
        .eq("perfume_id", perfumeId);
    }

    // Save image metadata to database
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
      // Clean up uploaded file if database save fails
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

// Delete image from storage and database
export const deletePerfumeImage = async (imageId: string): Promise<boolean> => {
  try {
    // Get image data first
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

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("perfume-images")
      .remove([imageData.file_path]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
      toast.error("Failed to delete image from storage");
      return false;
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("perfume_images")
      .delete()
      .eq("id", imageId);

    if (dbError) {
      console.error("Error deleting from database:", dbError);
      toast.error("Failed to delete image from database");
      return false;
    }

    // If this was the primary image, set another image as primary
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

// Get all images for a perfume
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

// Set image as primary
export const setPrimaryImage = async (imageId: string): Promise<boolean> => {
  try {
    // Get image data
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

    // Update other images to not be primary
    await supabase
      .from("perfume_images")
      .update({ is_primary: false })
      .eq("perfume_id", imageData.perfume_id);

    // Set this image as primary
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

// Update image display order
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

// Validate image file
export const validateImageFile = (file: File): string | null => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    return "Only JPEG, PNG, and WebP images are allowed";
  }

  if (file.size > maxSize) {
    return "Image size must be less than 5MB";
  }

  return null;
};
