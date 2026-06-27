/**
 * useReviews.ts
 *
 * hook للبيانات والتعديلات الخاص بمورد "المراجعات" في لوحة الإدارة (المراجعة).
 * يحمّل كل مراجعة (مع اسم عطرها) إضافةً إلى عدد المعلّقة، ويوفّر إجراءَي
 * الموافقة/الحذف. تتيح معرّفات الانشغال لكل صف أن يُظهر الجدول مؤشّر تحميل
 * على الصف الجاري التعامل معه فقط.
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  fetchAllReviews,
  approveReview,
  deleteReview,
  fetchPendingReviewCount,
  Review,
} from "@/services/reviewsService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useConfirmDialog } from "./useConfirmDialog";

/**
 * hook يدير مراجعة المراجعات في لوحة الإدارة.
 * @returns قائمة المراجعات، وحالة التحميل + عدد المعلّقة، ومعرّفات الانشغال لكل صف،
 *          و`loadReviews`/`handleApproveReview`/`handleDeleteReview`، إضافةً إلى
 *          props نافذة التأكيد الخاصة بتأكيد الحذف.
 */
export function useReviews() {
  const { t } = useLanguage();
  const { confirm, confirmDialogProps } = useConfirmDialog();
  // تُدمَج المراجعات مع perfume_name الخاص بها لعرضها في الجدول.
  const [reviews, setReviews] = useState<(Review & { perfume_name: string })[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  // عدد المراجعات التي لم تتم الموافقة عليها بعد (يُغذّي شارة الشريط الجانبي هنا أيضًا).
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  // تتبّع المراجعة الجاري الموافقة عليها/حذفها حاليًا من أجل مؤشّرات التحميل على مستوى الصف.
  const [approvingReview, setApprovingReview] = useState<string | null>(null);
  const [deletingReview, setDeletingReview] = useState<string | null>(null);

  // تحميل جميع المراجعات وعدد المعلّقة معًا.
  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      // جلب القائمة الكاملة وعدد المعلّقة بالتوازي.
      const [allReviews, pendingCount] = await Promise.all([
        fetchAllReviews(),
        fetchPendingReviewCount(),
      ]);
      setReviews(allReviews);
      setPendingReviewCount(pendingCount);
    } catch {
      toast.error(t("admin.reviews.toast.loadFailed"));
    } finally {
      setReviewsLoading(false);
    }
  };

  // الموافقة على مراجعة واحدة (الحالة من pending إلى approved)، ثم إعادة جلب القائمة.
  const handleApproveReview = async (reviewId: string) => {
    setApprovingReview(reviewId);
    try {
      await approveReview(reviewId);
      // إعادة الجلب كي يعكس الجدول + عدد المعلّقة الحالة الجديدة.
      await loadReviews();
      toast.success(t("admin.reviews.toast.approved"));
    } catch {
      toast.error(t("admin.reviews.toast.approveFailed"));
    } finally {
      setApprovingReview(null);
    }
  };

  // حذف مراجعة بعد تأكيد تحذيري (danger) صريح، ثم إعادة الجلب.
  const handleDeleteReview = async (reviewId: string) => {
    // منع الإجراء التدميري إلا عبر نافذة التأكيد.
    const confirmed = await confirm({
      title: t("admin.confirmDialog.deleteReview.title"),
      description: t("admin.reviews.confirm.delete"),
      confirmLabel: t("admin.confirmDialog.delete"),
      variant: "danger",
    });
    if (!confirmed) return;
    setDeletingReview(reviewId);
    try {
      await deleteReview(reviewId);
      // إعادة الجلب لإسقاط الصف المحذوف وتحديث عدد المعلّقة.
      await loadReviews();
      toast.success(t("admin.reviews.toast.deleted"));
    } catch {
      toast.error(t("admin.reviews.toast.deleteFailed"));
    } finally {
      setDeletingReview(null);
    }
  };

  return {
    reviews,
    reviewsLoading,
    pendingReviewCount,
    approvingReview,
    deletingReview,
    confirmDialogProps,
    loadReviews,
    handleApproveReview,
    handleDeleteReview,
  };
}
