/**
 * ملف: CouponsPage.tsx
 * الدور: صفحة هدف المسار الخاصة بكوبونات الخصم في لوحة التحكم (/admin/coupons).
 * تربط بين منطق البيانات (hooks) وواجهة العرض (tab + dialog)، فهي غلاف رفيع لا يحتوي
 * على منطق عرض مباشر. تحتاج إلى قائمة العطور لأن الكوبون قد يرتبط بمنتجات محددة.
 */
import { useEffect } from "react";
import { usePerfumes } from "../hooks/usePerfumes";
import { useCoupons } from "../hooks/useCoupons";
import { CouponsTab } from "../tabs/CouponsTab";
import { CouponFormDialog } from "../dialogs/CouponFormDialog";

/**
 * المكوّن الرئيسي لصفحة الكوبونات.
 * يجمع بين خطّاف العطور وخطّاف الكوبونات، ثم يعرض جدول الكوبونات ونافذة إضافة/تعديل الكوبون.
 */
export default function CouponsPage() {
  const perfumesApi = usePerfumes();
  // يُمرَّر مرجع قائمة العطور إلى خطّاف الكوبونات لربط الكوبون بمنتجات معيّنة عند الحاجة
  const couponsApi = useCoupons({ perfumes: perfumesApi.perfumes });

  // عند أول تركيب للصفحة: تحميل العطور والكوبونات معًا مرة واحدة
  useEffect(() => {
    perfumesApi.loadPerfumes();
    couponsApi.loadCoupons();
  }, []);

  return (
    <>
      <CouponsTab couponsApi={couponsApi} />
      <CouponFormDialog couponsApi={couponsApi} perfumes={perfumesApi.perfumes} />
    </>
  );
}
