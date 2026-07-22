/**
 * ملف: InfluencersPage.tsx
 * الدور: صفحة هدف المسار الخاصة بالمشاهير (/admin/influencers).
 * غلاف رفيع يربط الـ hook بجدول العرض ونوافذه، بلا منطق عرض مباشر.
 */
import { useEffect } from "react";
import { useInfluencers } from "../hooks/useInfluencers";
import { InfluencersTab } from "../tabs/InfluencersTab";
import { InfluencerFormDialog } from "../dialogs/InfluencerFormDialog";

export default function InfluencersPage() {
  const influencersApi = useInfluencers();

  // تحميل الملخّصات مرة واحدة عند أول تركيب للصفحة
  useEffect(() => {
    influencersApi.loadSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <InfluencersTab influencersApi={influencersApi} />
      <InfluencerFormDialog influencersApi={influencersApi} />
    </>
  );
}
