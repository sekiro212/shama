/**
 * ملف: ReviewsPage.tsx
 * الدور: صفحة هدف المسار الخاصة بمراجعات المنتجات في لوحة التحكم (/admin/reviews).
 * غلاف رفيع يربط خطّاف بيانات المراجعات بواجهة عرضها (موافقة/حذف المراجعات).
 */
import { useEffect } from "react";
import { useReviews } from "../hooks/useReviews";
import { ReviewsTab } from "../tabs/ReviewsTab";

/**
 * المكوّن الرئيسي لصفحة المراجعات.
 * يحمّل المراجعات عند التركيب ثم يمرّرها إلى مكوّن العرض ReviewsTab.
 */
export default function ReviewsPage() {
  const reviewsApi = useReviews();

  // جلب المراجعات مرة واحدة عند أول تحميل للصفحة
  useEffect(() => {
    reviewsApi.loadReviews();
  }, []);

  return <ReviewsTab reviewsApi={reviewsApi} />;
}
