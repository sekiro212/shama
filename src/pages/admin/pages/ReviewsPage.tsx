import { useEffect } from "react";
import { useReviews } from "../hooks/useReviews";
import { ReviewsTab } from "../tabs/ReviewsTab";

export default function ReviewsPage() {
  const reviewsApi = useReviews();

  useEffect(() => {
    reviewsApi.loadReviews();
  }, []);

  return <ReviewsTab reviewsApi={reviewsApi} />;
}
