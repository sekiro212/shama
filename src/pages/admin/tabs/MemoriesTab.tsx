import { useState, useMemo } from "react";
import { Search, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import type { useMemories } from "../hooks/useMemories";

interface MemoriesTabProps {
  memoriesApi: ReturnType<typeof useMemories>;
}

export function MemoriesTab({ memoriesApi }: MemoriesTabProps) {
  const { t, isRTL } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    memories,
    memoriesLoading,
    pendingMemoryCount,
    approvingMemory,
    deletingMemory,
    handleApproveMemory,
    handleDeleteMemory,
    confirmDialogProps,
  } = memoriesApi;

  const filteredMemories = useMemo(() => {
    return memories.filter((memory) => {
      const matchesStatus = statusFilter === "all" || memory.status === statusFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        memory.memory_text.toLowerCase().includes(query) ||
        memory.perfume_name.toLowerCase().includes(query) ||
        (memory.author_name || "").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [memories, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-[#323D50] dark:text-[#F5F5F5]">
            {t("admin.memories.title")}
          </h2>
          {pendingMemoryCount > 0 && (
            <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold">
              {pendingMemoryCount}
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1 border border-[#323D50]/15 dark:border-white/20 rounded-lg p-1">
            <Button
              size="sm"
              variant={statusFilter === "all" ? "default" : "ghost"}
              className={`h-7 px-3 text-xs cursor-pointer ${
                statusFilter === "all"
                  ? "bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
                  : "text-[#6B7B8D]"
              }`}
              onClick={() => setStatusFilter("all")}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "pending" ? "default" : "ghost"}
              className={`h-7 px-3 text-xs cursor-pointer ${
                statusFilter === "pending"
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "text-[#6B7B8D]"
              }`}
              onClick={() => setStatusFilter("pending")}
            >
              {t("admin.memories.pending")}
              {pendingMemoryCount > 0 && (
                <span className="ms-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-white/20 text-[10px] font-bold">
                  {pendingMemoryCount}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "approved" ? "default" : "ghost"}
              className={`h-7 px-3 text-xs cursor-pointer ${
                statusFilter === "approved"
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "text-[#6B7B8D]"
              }`}
              onClick={() => setStatusFilter("approved")}
            >
              {t("admin.memories.approved")}
            </Button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7B8D]`} />
            <Input
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${isRTL ? "pr-9" : "pl-9"} glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20`}
            />
          </div>
        </div>
      </div>

      {memoriesLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 rounded-xl animate-pulse">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#323D50]/10 dark:bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-[#323D50]/10 dark:bg-white/10 rounded w-1/3" />
                  <div className="h-3 bg-[#323D50]/10 dark:bg-white/10 rounded w-1/4" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-16 bg-[#323D50]/10 dark:bg-white/10 rounded" />
                  <div className="h-8 w-16 bg-[#323D50]/10 dark:bg-white/10 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMemories.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={memories.length === 0 ? t("admin.memories.empty") : "No memories match your filters"}
          subtitle={memories.length > 0 ? "Try adjusting your search or filter criteria." : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filteredMemories.map((memory) => (
            <div
              key={memory.id}
              className={`glass-card p-4 rounded-xl border-s-4 transition-colors ${
                memory.status === "pending"
                  ? "border-amber-500 bg-amber-500/5"
                  : "border-transparent"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#323D50] dark:text-[#F5F5F5] italic mb-1">
                    &ldquo;{memory.memory_text}&rdquo;
                  </p>
                  <p className="text-xs text-[#5B8DD9] mb-0.5">
                    &mdash; {memory.perfume_name}
                  </p>
                  {memory.author_name && (
                    <p className="text-xs text-[#6B7B8D]">{memory.author_name}</p>
                  )}
                  <p className="text-xs text-[#6B7B8D] mt-1">
                    {new Date(memory.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={memory.status} type="memory" />
                  {memory.status === "pending" && (
                    <LoadingButton
                      size="sm"
                      loading={approvingMemory === memory.id}
                      onClick={() => handleApproveMemory(memory.id)}
                      className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                    >
                      {t("admin.memories.approve")}
                    </LoadingButton>
                  )}
                  <LoadingButton
                    size="sm"
                    variant="destructive"
                    loading={deletingMemory === memory.id}
                    onClick={() => handleDeleteMemory(memory.id)}
                    className="cursor-pointer"
                  >
                    {t("admin.memories.delete")}
                  </LoadingButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
