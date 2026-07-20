/**
 * useInfluencers.ts
 *
 * hook للبيانات والتعديلات الخاص بمورد "المشاهير" في لوحة الإدارة.
 * يملك قائمة الملخّصات (من العرض المجمَّع)، وحالة نموذج الإنشاء/التعديل،
 * وحالة نافذة قائمة الحساب (تفصيل الأكواد + سجلّ الدفعات + تسجيل دفعة).
 * تُفوَّض جميع عمليات Supabase إلى `influencersService`.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  fetchInfluencers,
  fetchInfluencerSummaries,
  fetchInfluencerCodeStats,
  fetchInfluencerPayouts,
  createInfluencer,
  updateInfluencer,
  deleteInfluencer,
  countCodesForInfluencer,
  recordInfluencerPayout,
  type Influencer,
  type InfluencerAccountSummary,
  type InfluencerCodeStat,
  type InfluencerPayout,
} from "@/services/influencersService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useConfirmDialog } from "./useConfirmDialog";

/** حالة نموذج المشهور. الحقول الرقمية نصوص لأنها مرتبطة بمدخلات نصّية. */
export interface InfluencerFormState {
  name: string;
  phone: string;
  instagram_handle: string;
  notes: string;
  default_commission_rate: string;
  is_active: boolean;
}

/** حالة نموذج تسجيل الدفعة. */
export interface PayoutFormState {
  amount: string;
  method: string;
  note: string;
}

const initialForm: InfluencerFormState = {
  name: "",
  phone: "",
  instagram_handle: "",
  notes: "",
  default_commission_rate: "3",
  is_active: true,
};

const initialPayoutForm: PayoutFormState = {
  amount: "",
  method: "cash",
  note: "",
};

export function useInfluencers() {
  const { t } = useLanguage();
  const { confirm, confirmDialogProps } = useConfirmDialog();

  const [summaries, setSummaries] = useState<InfluencerAccountSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(
    null
  );
  const [form, setForm] = useState<InfluencerFormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [statementInfluencer, setStatementInfluencer] =
    useState<InfluencerAccountSummary | null>(null);
  const [codeStats, setCodeStats] = useState<InfluencerCodeStat[]>([]);
  const [payouts, setPayouts] = useState<InfluencerPayout[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);

  const [payoutForm, setPayoutForm] =
    useState<PayoutFormState>(initialPayoutForm);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSubmitLoading, setPayoutSubmitLoading] = useState(false);

  // جلب ملخّصات كل المشاهير من العرض المجمَّع.
  const loadSummaries = async () => {
    setSummariesLoading(true);
    try {
      const data = await fetchInfluencerSummaries();
      setSummaries(data);
    } catch {
      toast.error(t("admin.influencers.toast.loadFailed"));
    } finally {
      setSummariesLoading(false);
    }
  };

  // فتح النموذج في وضع "الإنشاء".
  const openCreate = () => {
    setEditingInfluencer(null);
    setForm(initialForm);
    setFormError(null);
    setIsFormDialogOpen(true);
  };

  // فتح النموذج في وضع "التعديل". الملخّص لا يحمل كل الحقول، فنجلب الصف الكامل.
  const openEdit = async (id: string) => {
    let all: Influencer[];
    try {
      all = await fetchInfluencers();
    } catch {
      toast.error(t("admin.influencers.toast.loadFailed"));
      return;
    }
    const found = all.find((i) => i.id === id);
    if (!found) {
      toast.error(t("admin.influencers.toast.loadFailed"));
      return;
    }
    setEditingInfluencer(found);
    setForm({
      name: found.name,
      phone: found.phone ?? "",
      instagram_handle: found.instagram_handle ?? "",
      notes: found.notes ?? "",
      default_commission_rate: String(found.default_commission_rate),
      is_active: found.is_active,
    });
    setFormError(null);
    setIsFormDialogOpen(true);
  };

  // إنشاء أو تحديث حسب وضع التعديل، ثم الإغلاق وإعادة الجلب.
  const handleSubmit = async () => {
    const name = form.name.trim();
    if (!name) {
      setFormError(t("admin.influencers.validation.nameRequired"));
      return;
    }
    const rate = Number(form.default_commission_rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setFormError(t("admin.influencers.validation.rateRange"));
      return;
    }

    const payload = {
      name,
      phone: form.phone.trim() || null,
      instagram_handle: form.instagram_handle.trim() || null,
      notes: form.notes.trim() || null,
      default_commission_rate: rate,
      is_active: form.is_active,
    };

    setSubmitLoading(true);
    try {
      if (editingInfluencer) {
        await updateInfluencer(editingInfluencer.id, payload);
        toast.success(t("admin.influencers.toast.updated"));
      } else {
        await createInfluencer(payload);
        toast.success(t("admin.influencers.toast.created"));
      }
      setIsFormDialogOpen(false);
      setEditingInfluencer(null);
      setForm(initialForm);
      setFormError(null);
      await loadSummaries();
    } catch (err) {
      console.error("Error saving influencer:", err);
      toast.error(t("admin.influencers.toast.saveFailed"));
    } finally {
      setSubmitLoading(false);
    }
  };

  // حذف مشهور بعد تأكيد يذكر عدد أكواده التي ستُفَك.
  const handleDelete = async (id: string) => {
    let codeCount: number;
    try {
      codeCount = await countCodesForInfluencer(id);
    } catch {
      toast.error(t("admin.influencers.toast.loadFailed"));
      return;
    }
    const description =
      codeCount > 0
        ? t("admin.influencers.confirm.deleteWithCodes").replace(
            "{count}",
            String(codeCount)
          )
        : t("admin.influencers.confirm.delete");

    const confirmed = await confirm({
      title: t("admin.confirmDialog.deleteInfluencer.title"),
      description,
      confirmLabel: t("admin.confirmDialog.delete"),
      variant: "danger",
    });
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await deleteInfluencer(id);
      toast.success(t("admin.influencers.toast.deleted"));
      await loadSummaries();
    } catch {
      toast.error(t("admin.influencers.toast.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  // فتح قائمة الحساب: تفصيل الأكواد + سجلّ الدفعات، مع تعبئة مبلغ الدفعة
  // المقترح بالرصيد المتبقي (ويبقى قابلًا للتعديل).
  const openStatement = async (row: InfluencerAccountSummary) => {
    setStatementInfluencer(row);
    setIsStatementOpen(true);
    setPayoutForm({
      ...initialPayoutForm,
      amount: row.balance_due > 0 ? String(row.balance_due) : "",
    });
    setPayoutError(null);
    // نُفرغ بيانات المشهور السابق فورًا وإلا بقيت أرقامه معروضة تحت اسم
    // المشهور الجديد إلى أن تُحلّ عمليات الجلب أدناه.
    setCodeStats([]);
    setPayouts([]);
    setStatementLoading(true);
    try {
      const [stats, history] = await Promise.all([
        fetchInfluencerCodeStats(row.influencer_id),
        fetchInfluencerPayouts(row.influencer_id),
      ]);
      setCodeStats(stats);
      setPayouts(history);
    } catch {
      toast.error(t("admin.influencers.toast.loadFailed"));
    } finally {
      setStatementLoading(false);
    }
  };

  // تسجيل دفعة. المبلغ الأكبر من الرصيد مسموح (دفعة مقدّمة) — التحذير في الواجهة.
  const handleRecordPayout = async () => {
    if (!statementInfluencer) return;
    const amount = Number(payoutForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayoutError(t("admin.influencers.validation.amountRequired"));
      return;
    }
    setPayoutSubmitLoading(true);
    try {
      await recordInfluencerPayout({
        influencer_id: statementInfluencer.influencer_id,
        amount,
        method: payoutForm.method || null,
        note: payoutForm.note.trim() || null,
      });
      toast.success(t("admin.influencers.toast.payoutRecorded"));
      setPayoutError(null);
      // إعادة جلب السجلّ والملخّصات حتى يتحدّث الرصيد المعروض فورًا.
      const [history, fresh] = await Promise.all([
        fetchInfluencerPayouts(statementInfluencer.influencer_id),
        fetchInfluencerSummaries(),
      ]);
      setPayouts(history);
      setSummaries(fresh);
      const updated = fresh.find(
        (s) => s.influencer_id === statementInfluencer.influencer_id
      );
      if (updated) setStatementInfluencer(updated);
      setPayoutForm({ ...initialPayoutForm, amount: "" });
    } catch (err) {
      console.error("Error recording payout:", err);
      toast.error(t("admin.influencers.toast.payoutFailed"));
    } finally {
      setPayoutSubmitLoading(false);
    }
  };

  // إحصاءات مشتقّة لبطاقات الأعلى.
  const totalCommission = useMemo(
    () => summaries.reduce((sum, s) => sum + s.commission_earned, 0),
    [summaries]
  );
  const totalBalance = useMemo(
    () => summaries.reduce((sum, s) => sum + s.balance_due, 0),
    [summaries]
  );

  return {
    summaries,
    summariesLoading,
    isFormDialogOpen,
    setIsFormDialogOpen,
    editingInfluencer,
    setEditingInfluencer,
    form,
    setForm,
    formError,
    setFormError,
    submitLoading,
    deletingId,
    isStatementOpen,
    setIsStatementOpen,
    statementInfluencer,
    codeStats,
    payouts,
    statementLoading,
    payoutForm,
    setPayoutForm,
    payoutError,
    payoutSubmitLoading,
    totalCommission,
    totalBalance,
    loadSummaries,
    openCreate,
    openEdit,
    handleSubmit,
    handleDelete,
    openStatement,
    handleRecordPayout,
    confirmDialogProps,
  };
}
