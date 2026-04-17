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

export function useReviews() {
  const { t } = useLanguage();
  const { confirm, confirmDialogProps } = useConfirmDialog();
  const [reviews, setReviews] = useState<(Review & { perfume_name: string })[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [approvingReview, setApprovingReview] = useState<string | null>(null);
  const [deletingReview, setDeletingReview] = useState<string | null>(null);

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
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

  const handleApproveReview = async (reviewId: string) => {
    setApprovingReview(reviewId);
    try {
      await approveReview(reviewId);
      await loadReviews();
      toast.success(t("admin.reviews.toast.approved"));
    } catch {
      toast.error(t("admin.reviews.toast.approveFailed"));
    } finally {
      setApprovingReview(null);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
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
