/**
 * useMemories.ts
 *
 * hook للبيانات والتعديلات الخاص بمورد "الذكريات" في لوحة الإدارة (الذكريات
 * المُرسَلة من المستخدمين بانتظار المراجعة). يحمّل جميع الذكريات إضافةً إلى عدد المعلّقة منها
 * ويوفّر إجراءَي الموافقة/الحذف، بما يماثل سير مراجعة المراجعات.
 */
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

/**
 * hook يدير مراجعة الذكريات في لوحة الإدارة.
 * @returns قائمة الذكريات، وحالة التحميل + عدد المعلّقة، ومعرّفات الانشغال لكل صف،
 *          و`loadMemories`/`handleApproveMemory`/`handleDeleteMemory`، إضافةً إلى
 *          props نافذة التأكيد الخاصة بتأكيد الحذف.
 */
export function useMemories() {
  const { t } = useLanguage();
  const { confirm, confirmDialogProps } = useConfirmDialog();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  // عدد الذكريات التي ما زالت تنتظر الموافقة.
  const [pendingMemoryCount, setPendingMemoryCount] = useState(0);
  // معرّفات الانشغال لكل صف كي يُظهر الجدول مؤشّر التحميل على الذكرى المتأثّرة فقط.
  const [approvingMemory, setApprovingMemory] = useState<string | null>(null);
  const [deletingMemory, setDeletingMemory] = useState<string | null>(null);

  // تحميل جميع الذكريات وعدد المعلّقة معًا.
  const loadMemories = async () => {
    setMemoriesLoading(true);
    try {
      // جلب القائمة وعدد المعلّقة بالتوازي.
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

  // الموافقة على ذكرى واحدة، ثم إعادة الجلب لتحديث القائمة + عدد المعلّقة.
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

  // حذف ذكرى بعد تأكيد تحذيري (danger)، ثم إعادة الجلب.
  const handleDeleteMemory = async (id: string) => {
    // اشتراط حدوث الحذف التدميري عبر نافذة التأكيد.
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
