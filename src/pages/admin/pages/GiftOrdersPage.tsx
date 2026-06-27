/**
 * ملف: GiftOrdersPage.tsx
 * الدور: صفحة هدف المسار الخاصة بطلبات الهدايا في لوحة التحكم (/admin/gift-orders).
 * غلاف رفيع يربط خطّاف بيانات طلبات الهدايا بواجهة عرضها.
 */
import { useEffect } from "react";
import { useGiftOrders } from "../hooks/useGiftOrders";
import { GiftOrdersTab } from "../tabs/GiftOrdersTab";

/**
 * المكوّن الرئيسي لصفحة طلبات الهدايا.
 * يحمّل طلبات الهدايا عند التركيب ثم يمرّرها إلى مكوّن العرض GiftOrdersTab.
 */
export default function GiftOrdersPage() {
  const giftOrdersApi = useGiftOrders();

  // جلب طلبات الهدايا مرة واحدة عند أول تحميل للصفحة
  useEffect(() => {
    giftOrdersApi.fetchGiftOrders();
  }, []);

  return <GiftOrdersTab giftOrdersApi={giftOrdersApi} />;
}
