import { useState, useMemo } from "react";
import {
  Star,
  Check,
  Trash2,
  Search,
  MessageSquare,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { useLanguage } from "@/contexts/LanguageContext";
import { EmptyState } from "../components/EmptyState";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
import type { useReviews } from "../hooks/useReviews";

interface ReviewsTabProps {
  reviewsApi: ReturnType<typeof useReviews>;
}

export function ReviewsTab({ reviewsApi }: ReviewsTabProps) {
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    reviews,
    reviewsLoading,
    approvingReview,
    deletingReview,
    handleApproveReview,
    handleDeleteReview,
    confirmDialogProps,
  } = reviewsApi;

  const flaggedReviews = useMemo(() => {
    const pending = reviews.filter((r) => r.status === "pending");
    if (!searchQuery.trim()) return pending;
    const q = searchQuery.toLowerCase();
    return pending.filter(
      (r) =>
        r.perfume_name.toLowerCase().includes(q) ||
        r.user_email.toLowerCase().includes(q) ||
        (r.comment ?? "").toLowerCase().includes(q) ||
        (r.ai_reason ?? "").toLowerCase().includes(q),
    );
  }, [reviews, searchQuery]);

  const flaggedCount = reviews.filter((r) => r.status === "pending").length;
  const approvedCount = reviews.length - flaggedCount;

  if (reviewsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-card p-6 rounded-2xl animate-pulse h-32"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-amber-500" />
          <div>
            <h2 className="text-2xl font-bold text-[#323D50] dark:text-white">
              {t("admin.reviews.flaggedTitle") !== "admin.reviews.flaggedTitle"
                ? t("admin.reviews.flaggedTitle")
                : "AI-Flagged Reviews"}
            </h2>
            <p className="text-sm text-[#6B7B8D] dark:text-white/60 mt-0.5">
              {t("admin.reviews.flaggedSubtitle") !== "admin.reviews.flaggedSubtitle"
                ? t("admin.reviews.flaggedSubtitle")
                : "Good reviews auto-publish. Only reviews the AI couldn't auto-approve appear here."}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="glass-card px-4 py-2 rounded-xl text-sm">
            <span className="text-[#6B7B8D] dark:text-white/60">
              {t("admin.reviews.needsReview") !== "admin.reviews.needsReview"
                ? t("admin.reviews.needsReview")
                : "Needs review"}
              :{" "}
            </span>
            <span className="text-amber-500 font-bold">{flaggedCount}</span>
          </div>
          <div className="glass-card px-4 py-2 rounded-xl text-sm">
            <span className="text-[#6B7B8D] dark:text-white/60">
              {t("admin.reviews.autoApproved") !== "admin.reviews.autoApproved"
                ? t("admin.reviews.autoApproved")
                : "Auto-approved"}
              :{" "}
            </span>
            <span className="text-green-500 font-bold">{approvedCount}</span>
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search
          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7B8D] ${
            isRTL ? "right-3" : "left-3"
          }`}
        />
        <Input
          placeholder={
            t("admin.reviews.searchPlaceholder") !== "admin.reviews.searchPlaceholder"
              ? t("admin.reviews.searchPlaceholder")
              : "Search by product, email, or AI reason..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 ${
            isRTL ? "pr-9" : "pl-9"
          }`}
        />
      </div>

      {flaggedReviews.length === 0 ? (
        <EmptyState
          icon={searchQuery ? MessageSquare : Check}
          title={
            searchQuery
              ? t("admin.reviews.noMatches") !== "admin.reviews.noMatches"
                ? t("admin.reviews.noMatches")
                : "No flagged reviews match your search"
              : t("admin.reviews.allClear") !== "admin.reviews.allClear"
                ? t("admin.reviews.allClear")
                : "All clear — no reviews need your attention"
          }
          subtitle={
            searchQuery
              ? `No results for "${searchQuery}"`
              : t("admin.reviews.allClearSubtitle") !== "admin.reviews.allClearSubtitle"
                ? t("admin.reviews.allClearSubtitle")
                : "The AI moderator auto-approves good reviews. Flagged ones will appear here."
          }
        />
      ) : (
        <div className="space-y-4">
          {flaggedReviews.map((review) => (
            <FlaggedReviewCard
              key={review.id}
              review={review}
              isApproving={approvingReview === review.id}
              isDeleting={deletingReview === review.id}
              onApprove={() => handleApproveReview(review.id)}
              onDelete={() => handleDeleteReview(review.id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

interface FlaggedReviewCardProps {
  review: {
    id: string;
    perfume_name: string;
    user_email: string;
    rating: number;
    comment: string;
    ai_reason: string | null;
    created_at: string;
  };
  isApproving: boolean;
  isDeleting: boolean;
  onApprove: () => void;
  onDelete: () => void;
}

function FlaggedReviewCard({
  review,
  isApproving,
  isDeleting,
  onApprove,
  onDelete,
}: FlaggedReviewCardProps) {
  const { t } = useLanguage();

  return (
    <div className="glass-card rounded-2xl overflow-hidden border-s-4 border-amber-500">
      <div className="bg-amber-500/10 dark:bg-amber-500/5 px-5 py-3 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
            {t("admin.reviews.aiFlaggedLabel") !== "admin.reviews.aiFlaggedLabel"
              ? t("admin.reviews.aiFlaggedLabel")
              : "AI moderator flagged this review"}
          </p>
          <p className="text-sm text-[#323D50] dark:text-white/90 leading-relaxed">
            {review.ai_reason ??
              (t("admin.reviews.noReasonProvided") !== "admin.reviews.noReasonProvided"
                ? t("admin.reviews.noReasonProvided")
                : "No reason provided.")}
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#323D50] dark:text-white text-base truncate">
              {review.perfume_name}
            </p>
            <p className="text-xs text-[#6B7B8D] dark:text-white/50 mt-0.5">
              {review.user_email}
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${
                  s <= review.rating
                    ? "text-amber-400 fill-amber-400"
                    : "text-[#6B7B8D]/30 dark:text-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-[#F8F9FB] dark:bg-white/5 rounded-xl p-4 mb-4 border border-[#323D50]/5 dark:border-white/5">
          <p className="text-sm text-[#323D50]/90 dark:text-white/80 whitespace-pre-wrap break-words leading-relaxed">
            {review.comment || (
              <span className="italic text-[#6B7B8D]">(empty)</span>
            )}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-[#6B7B8D] dark:text-white/50">
            {new Date(review.created_at).toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <LoadingButton
              variant="outline"
              size="sm"
              onClick={onApprove}
              loading={isApproving}
              loadingText=""
              className="h-9 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10 hover:border-green-500/50 cursor-pointer"
            >
              <Check className="w-4 h-4 me-1.5" />
              {t("admin.reviews.approveAnyway") !== "admin.reviews.approveAnyway"
                ? t("admin.reviews.approveAnyway")
                : "Approve anyway"}
            </LoadingButton>
            <LoadingButton
              size="sm"
              variant="destructive"
              onClick={onDelete}
              loading={isDeleting}
              loadingText=""
              className="h-9 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 me-1.5" />
              {t("admin.reviews.delete") !== "admin.reviews.delete"
                ? t("admin.reviews.delete")
                : "Delete"}
            </LoadingButton>
          </div>
        </div>
      </div>
    </div>
  );
}
