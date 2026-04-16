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

export function usePerfumeImages({
  editingPerfume,
  reloadPerfumes,
}: UsePerfumeImagesOptions) {
  const { t } = useLanguage();
  const { confirm, confirmDialogProps } = useConfirmDialog();
  const [perfumeImages, setPerfumeImages] = useState<PerfumeImage[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPerfumeImages = async (perfumeId: string) => {
    try {
      const images = await getPerfumeImages(perfumeId);
      setPerfumeImages(images);
    } catch (error) {
      console.error("Error loading perfume images:", error);
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // If editing an existing perfume, upload images directly
    if (editingPerfume) {
      const perfumeId = editingPerfume.id;
      setImageUploading(true);

      const uploadPromises = Array.from(files).map(async (file) => {
        const validationError = validateImageFile(file);
        if (validationError) {
          toast.error(validationError);
          return null;
        }

        const isPrimary = perfumeImages.length === 0; // First image is primary
        return await uploadPerfumeImage(perfumeId, file, isPrimary);
      });

      try {
        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter(Boolean) as PerfumeImage[];

        if (successfulUploads.length > 0) {
          await loadPerfumeImages(perfumeId);
          await reloadPerfumes(); // Refresh perfumes list
        }
      } catch (error) {
        console.error("Error uploading images:", error);
        toast.error(t("admin.toast.imageUploadFailed"));
      } finally {
        setImageUploading(false);
      }
    } else {
      // If creating a new perfume, store images temporarily
      const validFiles = Array.from(files).filter((file) => {
        const validationError = validateImageFile(file);
        if (validationError) {
          toast.error(validationError);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        setPendingImages((prev) => [...prev, ...validFiles]);
        toast.success(
          `${validFiles.length} ${t("admin.toast.imagesReadyToUpload")}`
        );
      }
    }
  };

  const uploadPendingImages = async (perfumeId: string) => {
    if (pendingImages.length === 0) return;

    setImageUploading(true);
    const uploadPromises = pendingImages.map(async (file, index) => {
      const isPrimary = index === 0; // First image is primary
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

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageDelete = async (imageId: string) => {
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
        await loadPerfumeImages(editingPerfume.id);
        await reloadPerfumes(); // Refresh perfumes list
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    } finally {
      setDeletingImage(null);
    }
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    try {
      setSettingPrimary(imageId);
      const success = await setPrimaryImage(imageId);
      if (success && editingPerfume) {
        await loadPerfumeImages(editingPerfume.id);
        await reloadPerfumes(); // Refresh perfumes list
      }
    } catch (error) {
      console.error("Error setting primary image:", error);
    } finally {
      setSettingPrimary(null);
    }
  };

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
