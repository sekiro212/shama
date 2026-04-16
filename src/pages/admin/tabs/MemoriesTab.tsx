import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
import type { useMemories } from "../hooks/useMemories";

interface MemoriesTabProps {
  memoriesApi: ReturnType<typeof useMemories>;
}

export function MemoriesTab({ memoriesApi }: MemoriesTabProps) {
  const { t } = useLanguage();
  const {
    memories,
    memoriesLoading,
    approvingMemory,
    deletingMemory,
    handleApproveMemory,
    handleDeleteMemory,
    confirmDialogProps,
  } = memoriesApi;

  return (
    <div className="glass-card p-6 rounded-2xl">
      <h2 className="text-xl font-bold text-[#323D50] dark:text-[#F5F5F5] mb-6">
        {t("admin.memories.title")}
      </h2>
      {memoriesLoading ? (
        <div className="text-center py-8 text-[#6B7B8D]">
          {t("admin.loadingTitle")}
        </div>
      ) : memories.length === 0 ? (
        <p className="text-center text-[#6B7B8D] py-8">
          {t("admin.memories.empty")}
        </p>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="flex items-start justify-between gap-4 p-4 rounded-xl border border-[#5B8DD9]/10 bg-white/5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#F5F5F5] italic mb-1">
                  "{memory.memory_text}"
                </p>
                <p className="text-xs text-[#5B8DD9] mb-1">
                  — {memory.perfume_name}
                </p>
                {memory.author_name && (
                  <p className="text-xs text-[#6B7B8D]">
                    {memory.author_name}
                  </p>
                )}
                <p className="text-xs text-[#6B7B8D] mt-1">
                  {new Date(memory.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge
                  className={
                    memory.status === "approved"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-amber-500/20 text-amber-400"
                  }
                >
                  {memory.status === "approved"
                    ? t("admin.memories.approved")
                    : t("admin.memories.pending")}
                </Badge>
                {memory.status === "pending" && (
                  <LoadingButton
                    size="sm"
                    loading={approvingMemory === memory.id}
                    onClick={() => handleApproveMemory(memory.id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {t("admin.memories.approve")}
                  </LoadingButton>
                )}
                <LoadingButton
                  size="sm"
                  variant="destructive"
                  loading={deletingMemory === memory.id}
                  onClick={() => handleDeleteMemory(memory.id)}
                >
                  {t("admin.memories.delete")}
                </LoadingButton>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
