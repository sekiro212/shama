import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { generateProductDescription } from "@/services/aiService";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Perfume, PerfumeSample, PerfumeBottleSize } from "../types";
import { initialPerfumeData } from "../constants";
import { usePerfumeImages } from "./usePerfumeImages";
import { getPerfumeImages } from "@/services/imageService";
import { submitPerfume } from "./perfumeSubmit";
import { useConfirmDialog } from "./useConfirmDialog";

export function usePerfumes() {
  const { t } = useLanguage();
  const { confirm, confirmDialogProps } = useConfirmDialog();
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "bottle" | "sample" | "gift"
  >("all");
  const [filterGender, setFilterGender] = useState<
    "all" | "men" | "women" | "unisex"
  >("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPerfume, setEditingPerfume] = useState<Perfume | null>(null);
  const [formData, setFormData] = useState(initialPerfumeData);
  const [topNotes, setTopNotes] = useState("");
  const [middleNotes, setMiddleNotes] = useState("");
  const [baseNotes, setBaseNotes] = useState("");

  const [perfumeSamples, setPerfumeSamples] = useState<PerfumeSample[]>([]);
  const sampleSizes = ["3ml", "5ml", "10ml", "15ml", "20ml", "25ml", "30ml"];

  const [perfumeBottleSizes, setPerfumeBottleSizes] = useState<
    PerfumeBottleSize[]
  >([]);
  const bottleSizes = [
    "30ml",
    "50ml",
    "75ml",
    "100ml",
    "125ml",
    "150ml",
    "200ml",
  ];

  const [submitLoading, setSubmitLoading] = useState(false);
  const [deletingPerfume, setDeletingPerfume] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  const loadPerfumes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("perfumes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const perfumesWithImages = await Promise.all(
        (data || []).map(async (perfume) => {
          const images = await getPerfumeImages(perfume.id);
          return {
            ...perfume,
            images,
          };
        })
      );

      setPerfumes(perfumesWithImages);
    } catch (error) {
      console.error("Error loading perfumes:", error);
      toast.error(t("admin.toast.loadPerfumesFailed"));
    } finally {
      setLoading(false);
    }
  };

  const imagesApi = usePerfumeImages({
    editingPerfume,
    reloadPerfumes: loadPerfumes,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGenerateDescription = async () => {
    if (!formData.name) {
      toast.error(t("admin.toast.enterPerfumeName"));
      return;
    }

    try {
      setGeneratingDescription(true);
      const notes = {
        top: topNotes.split(",").map((n) => n.trim()).filter(Boolean),
        middle: middleNotes.split(",").map((n) => n.trim()).filter(Boolean),
        base: baseNotes.split(",").map((n) => n.trim()).filter(Boolean),
      };
      const description = await generateProductDescription(
        formData.name,
        notes,
        formData.gender
      );
      handleInputChange("description", description);
      toast.success(t("admin.toast.aiDescriptionGenerated"));
    } catch (error) {
      console.error("Error generating description:", error);
      toast.error(t("admin.toast.aiDescriptionFailed"));
    } finally {
      setGeneratingDescription(false);
    }
  };

  const resetForm = () => {
    setFormData(initialPerfumeData);
    setTopNotes("");
    setMiddleNotes("");
    setBaseNotes("");
    setEditingPerfume(null);
    imagesApi.resetImages();
    setPerfumeSamples([]);
    setPerfumeBottleSizes([]);
  };

  const handleSubmit = async () => {
    try {
      setSubmitLoading(true);
      const ok = await submitPerfume({
        formData,
        editingPerfume,
        topNotes,
        middleNotes,
        baseNotes,
        perfumeSamples,
        perfumeBottleSizes,
        pendingImages: imagesApi.pendingImages,
        uploadPendingImages: imagesApi.uploadPendingImages,
        t,
      });
      if (ok) {
        setIsDialogOpen(false);
        resetForm();
        loadPerfumes();
      }
    } catch (error) {
      console.error("Error saving perfume:", error);
      toast.error(t("admin.toast.perfumeSaveFailed"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const loadPerfumeSamples = async (perfumeId: string) => {
    try {
      const { data, error } = await supabase
        .from("perfume_samples")
        .select("*")
        .eq("perfume_id", perfumeId)
        .order("size");

      if (error) throw error;
      setPerfumeSamples(data || []);
    } catch (error) {
      console.error("Error loading perfume samples:", error);
    }
  };

  const loadPerfumeBottleSizes = async (perfumeId: string) => {
    try {
      console.log("Loading bottle sizes for perfume:", perfumeId);
      const { data, error } = await supabase
        .from("perfume_bottle_sizes")
        .select("*")
        .eq("perfume_id", perfumeId)
        .order("size");

      if (error) throw error;
      console.log("Loaded bottle sizes:", data);
      setPerfumeBottleSizes(data || []);
    } catch (error) {
      console.error("Error loading perfume bottle sizes:", error);
    }
  };

  const addSample = () => {
    const newSample: Omit<PerfumeSample, "id"> = {
      size: "3ml",
      price: 0,
      stock_quantity: 0,
      is_active: true,
    };
    setPerfumeSamples([...perfumeSamples, newSample as PerfumeSample]);
  };

  const removeSample = (index: number) => {
    setPerfumeSamples(perfumeSamples.filter((_, i) => i !== index));
  };

  const updateSample = (
    index: number,
    field: keyof PerfumeSample,
    value: any
  ) => {
    const updatedSamples = [...perfumeSamples];
    updatedSamples[index] = { ...updatedSamples[index], [field]: value };
    setPerfumeSamples(updatedSamples);
  };

  const addBottleSize = () => {
    const newBottleSize: Omit<PerfumeBottleSize, "id"> = {
      size: "50ml",
      price: 0,
      stock_quantity: 0,
      is_active: true,
    };
    setPerfumeBottleSizes([
      ...perfumeBottleSizes,
      newBottleSize as PerfumeBottleSize,
    ]);
  };

  const removeBottleSize = (index: number) => {
    setPerfumeBottleSizes(perfumeBottleSizes.filter((_, i) => i !== index));
  };

  const updateBottleSize = (
    index: number,
    field: keyof PerfumeBottleSize,
    value: any
  ) => {
    const updatedBottleSizes = [...perfumeBottleSizes];
    updatedBottleSizes[index] = {
      ...updatedBottleSizes[index],
      [field]: value,
    };
    setPerfumeBottleSizes(updatedBottleSizes);
  };

  const handleEdit = (perfume: Perfume) => {
    console.log("Editing perfume:", perfume);
    setEditingPerfume(perfume);
    setFormData({
      name: perfume.name,
      name_ar: perfume.name_ar || "",
      price: perfume.price,
      description: perfume.description,
      description_ar: perfume.description_ar || "",
      fragrance_notes: perfume.fragrance_notes,
      fragrance_notes_ar: perfume.fragrance_notes_ar || {
        top: [],
        middle: [],
        base: [],
      },
      size: perfume.size,
      type: perfume.type,
      rating: perfume.rating,
      gender: perfume.gender,
      stock_quantity: perfume.stock_quantity,
      is_active: perfume.is_active,
      has_samples: perfume.has_samples,
      has_bottle_sizes: perfume.has_bottle_sizes,
    });
    setTopNotes(perfume.fragrance_notes.top.join(", "));
    setMiddleNotes(perfume.fragrance_notes.middle.join(", "));
    setBaseNotes(perfume.fragrance_notes.base.join(", "));

    imagesApi.loadPerfumeImages(perfume.id);
    loadPerfumeSamples(perfume.id);
    loadPerfumeBottleSizes(perfume.id);

    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t("admin.confirmDialog.deletePerfume.title"),
      description: t("admin.confirm.deletePerfume"),
      confirmLabel: t("admin.confirmDialog.delete"),
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      setDeletingPerfume(id);
      const { error } = await supabase.from("perfumes").delete().eq("id", id);

      if (error) throw error;

      toast.success(t("admin.toast.perfumeDeletedSuccess"));
      loadPerfumes();
    } catch (error) {
      console.error("Error deleting perfume:", error);
      toast.error(t("admin.toast.perfumeDeleteFailed"));
    } finally {
      setDeletingPerfume(null);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      setTogglingStatus(id);
      const { error } = await supabase
        .from("perfumes")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(
        !currentStatus
          ? t("admin.toast.perfumeActivated")
          : t("admin.toast.perfumeDeactivated")
      );
      loadPerfumes();
    } catch (error) {
      console.error("Error updating perfume status:", error);
      toast.error(t("admin.toast.perfumeStatusFailed"));
    } finally {
      setTogglingStatus(null);
    }
  };

  const filteredPerfumes = perfumes.filter((perfume) => {
    const matchesSearch = perfume.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || perfume.type === filterType;
    const matchesGender =
      filterGender === "all" || perfume.gender === filterGender;
    return matchesSearch && matchesType && matchesGender;
  });

  return {
    perfumes,
    loading,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterGender,
    setFilterGender,
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
    deletingPerfume,
    togglingStatus,
    generatingDescription,
    filteredPerfumes,
    loadPerfumes,
    handleInputChange,
    handleGenerateDescription,
    handleSubmit,
    resetForm,
    addSample,
    removeSample,
    updateSample,
    addBottleSize,
    removeBottleSize,
    updateBottleSize,
    handleEdit,
    handleDelete,
    toggleStatus,
    confirmDialogProps,
    images: imagesApi,
  };
}
