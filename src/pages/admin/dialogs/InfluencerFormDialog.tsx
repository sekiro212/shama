/**
 * InfluencerFormDialog.tsx
 * ------------------------
 * نموذج نافذة لإنشاء أو تعديل مشهور. كل الحالة تأتي من الـ hook
 * `useInfluencers` (يُمرَّر باسم `influencersApi`) — مكوّن عرض محض.
 * النسبة هنا هي الافتراضية التي تُعبّئ نموذج الكوبون؛ النسبة الفعلية
 * تُضبط على مستوى كل كود.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { useInfluencers } from "../hooks/useInfluencers";

interface InfluencerFormDialogProps {
  influencersApi: ReturnType<typeof useInfluencers>;
}

export function InfluencerFormDialog({
  influencersApi,
}: InfluencerFormDialogProps) {
  const { t } = useLanguage();
  const {
    isFormDialogOpen,
    setIsFormDialogOpen,
    editingInfluencer,
    setEditingInfluencer,
    form,
    setForm,
    formError,
    setFormError,
    submitLoading,
    handleSubmit,
  } = influencersApi;

  return (
    <Dialog
      open={isFormDialogOpen}
      onOpenChange={(open) => {
        setIsFormDialogOpen(open);
        if (!open) {
          setEditingInfluencer(null);
          setFormError(null);
        }
      }}
    >
      <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {editingInfluencer
              ? t("admin.influencers.edit")
              : t("admin.influencers.create")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("admin.influencers.name")} *</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("admin.influencers.namePlaceholder")}
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("admin.influencers.phone")}</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.influencers.instagram")}</Label>
              <Input
                value={form.instagram_handle}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    instagram_handle: e.target.value,
                  }))
                }
                placeholder={t("admin.influencers.instagramPlaceholder")}
                className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("admin.influencers.defaultRate")}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={form.default_commission_rate}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  default_commission_rate: e.target.value,
                }))
              }
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("admin.influencers.notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) =>
                setForm((prev) => ({ ...prev, is_active: v }))
              }
            />
            <Label>{t("admin.influencers.active")}</Label>
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <LoadingButton
            loading={submitLoading}
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl"
          >
            {editingInfluencer
              ? t("admin.influencers.edit")
              : t("admin.influencers.create")}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
