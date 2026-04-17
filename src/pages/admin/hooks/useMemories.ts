import { useState } from "react";
import { toast } from "sonner";
import {
  fetchAllMemories,
  approveMemory,
  deleteMemory,
  fetchPendingMemoryCount,
  Memory,
} from "@/services/memoriesService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useConfirmDialog } from "./useConfirmDialog";

export function useMemories() {
  const { t } = useLanguage();
  const { confirm, confirmDialogProps } = useConfirmDialog();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [pendingMemoryCount, setPendingMemoryCount] = useState(0);
  const [approvingMemory, setApprovingMemory] = useState<string | null>(null);
  const [deletingMemory, setDeletingMemory] = useState<string | null>(null);

  const loadMemories = async () => {
    setMemoriesLoading(true);
    try {
      const [allMemories, pendingCount] = await Promise.all([
        fetchAllMemories(),
        fetchPendingMemoryCount(),
      ]);
      setMemories(allMemories);
      setPendingMemoryCount(pendingCount);
    } catch {
      toast.error(t("admin.memories.toast.loadFailed"));
    } finally {
      setMemoriesLoading(false);
    }
  };

  const handleApproveMemory = async (id: string) => {
    setApprovingMemory(id);
    try {
      await approveMemory(id);
      await loadMemories();
      toast.success(t("admin.memories.toast.approved"));
    } catch {
      toast.error(t("admin.memories.toast.approveFailed"));
    } finally {
      setApprovingMemory(null);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    const confirmed = await confirm({
      title: t("admin.confirmDialog.deleteMemory.title"),
      description: t("admin.memories.confirm.delete"),
      confirmLabel: t("admin.confirmDialog.delete"),
      variant: "danger",
    });
    if (!confirmed) return;
    setDeletingMemory(id);
    try {
      await deleteMemory(id);
      await loadMemories();
      toast.success(t("admin.memories.toast.deleted"));
    } catch {
      toast.error(t("admin.memories.toast.deleteFailed"));
    } finally {
      setDeletingMemory(null);
    }
  };

  return {
    memories,
    memoriesLoading,
    pendingMemoryCount,
    approvingMemory,
    deletingMemory,
    confirmDialogProps,
    loadMemories,
    handleApproveMemory,
    handleDeleteMemory,
  };
}
