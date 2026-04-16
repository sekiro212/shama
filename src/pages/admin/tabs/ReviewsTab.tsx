import { Star, Check, Trash2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
import type { useReviews } from "../hooks/useReviews";

interface ReviewsTabProps {
  reviewsApi: ReturnType<typeof useReviews>;
}

export function ReviewsTab({ reviewsApi }: ReviewsTabProps) {
  const { t } = useLanguage();
  const {
    reviews,
    reviewsLoading,
    pendingReviewCount,
    approvingReview,
    deletingReview,
    handleApproveReview,
    handleDeleteReview,
    confirmDialogProps,
  } = reviewsApi;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#323D50] dark:text-white">
          {t("admin.reviews.title")}
        </h2>
        <div className="flex gap-3">
          <div className="glass-card px-4 py-2 rounded-xl text-sm dark:text-white/70 text-[#6B7B8D]">
            {t("admin.reviews.pendingCount")}:{" "}
            <span className="text-amber-500 font-bold">{pendingReviewCount}</span>
          </div>
          <div className="glass-card px-4 py-2 rounded-xl text-sm dark:text-white/70 text-[#6B7B8D]">
            {t("admin.reviews.totalReviews")}:{" "}
            <span className="text-[#5B8DD9] font-bold">{reviews.length}</span>
          </div>
        </div>
      </div>
      {reviewsLoading ? (
        <div className="text-center py-12 dark:text-white/50 text-[#6B7B8D]">
          {t("admin.loadingTitle")}
        </div>
      ) : (
        <>
          {/* Pending Reviews */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b dark:border-white/10 border-[#323D50]/10 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="font-semibold dark:text-white text-[#323D50]">
                {t("admin.reviews.pendingReviews")}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-white/10 border-[#323D50]/10">
                    <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.product")}</TableHead>
                    <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.user")}</TableHead>
                    <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.rating")}</TableHead>
                    <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.comment")}</TableHead>
                    <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.date")}</TableHead>
                    <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.filter((r) => r.status === "pending").length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 dark:text-white/40 text-[#6B7B8D]">
                        {t("admin.reviews.noPendingReviews")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    reviews
                      .filter((r) => r.status === "pending")
                      .map((review) => (
                        <TableRow key={review.id} className="dark:border-white/10 border-[#323D50]/10">
                          <TableCell className="dark:text-white/80 text-[#323D50] font-medium max-w-[120px] truncate">
                            {review.perfume_name}
                          </TableCell>
                          <TableCell className="dark:text-white/60 text-[#6B7B8D] text-sm">
                            {review.user_email}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${s <= review.rating ? "text-amber-400 fill-amber-400" : "dark:text-white/20 text-[#6B7B8D]/30"}`}
                                />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="dark:text-white/60 text-[#6B7B8D] text-sm max-w-[200px] truncate">
                            {review.comment}
                          </TableCell>
                          <TableCell className="dark:text-white/50 text-[#6B7B8D] text-xs">
                            {new Date(review.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <LoadingButton
                                size="sm"
                                onClick={() => handleApproveReview(review.id)}
                                loading={approvingReview === review.id}
                                loadingText={t("admin.reviews.approving")}
                                className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs"
                              >
                                <Check className="w-3 h-3 me-1" />
                                {t("admin.reviews.approve")}
                              </LoadingButton>
                              <LoadingButton
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteReview(review.id)}
                                loading={deletingReview === review.id}
                                loadingText=""
                                className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </LoadingButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Approved Reviews */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b dark:border-white/10 border-[#323D50]/10 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <h3 className="font-semibold dark:text-white text-[#323D50]">
                {t("admin.reviews.approvedReviews")}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-white/10 border-[#323D50]/10">
                    <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.product")}</TableHead>
                    <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.user")}</TableHead>
                    <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.rating")}</TableHead>
                    <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.comment")}</TableHead>
                    <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.date")}</TableHead>
                    <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.filter((r) => r.status === "approved").length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 dark:text-white/40 text-[#6B7B8D]">
                        {t("admin.reviews.noApprovedReviews")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    reviews
                      .filter((r) => r.status === "approved")
                      .map((review) => (
                        <TableRow key={review.id} className="dark:border-white/10 border-[#323D50]/10">
                          <TableCell className="dark:text-white/80 text-[#323D50] font-medium max-w-[120px] truncate">
                            {review.perfume_name}
                          </TableCell>
                          <TableCell className="dark:text-white/60 text-[#6B7B8D] text-sm">
                            {review.user_email}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${s <= review.rating ? "text-amber-400 fill-amber-400" : "dark:text-white/20 text-[#6B7B8D]/30"}`}
                                />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="dark:text-white/60 text-[#6B7B8D] text-sm max-w-[200px] truncate">
                            {review.comment}
                          </TableCell>
                          <TableCell className="dark:text-white/50 text-[#6B7B8D] text-xs">
                            {new Date(review.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <LoadingButton
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteReview(review.id)}
                              loading={deletingReview === review.id}
                              loadingText=""
                              className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </LoadingButton>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
