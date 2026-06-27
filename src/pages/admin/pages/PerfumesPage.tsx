/**
 * ملف: PerfumesPage.tsx
 * الدور: صفحة هدف المسار الخاصة بإدارة العطور (المنتجات) في لوحة التحكم (/admin/perfumes).
 * تعرض جدول العطور ونافذة إضافة/تعديل العطر، وتستمع إلى ناقل الأحداث الإداري لإعادة
 * تحميل القائمة تلقائيًا عند تغيّر المخزون من شاشة أخرى (مثل شاشة الطلبات).
 */
import { useEffect } from "react";
import { usePerfumes } from "../hooks/usePerfumes";
import { useAdminEvent } from "../contexts/AdminEventContext";
import { PerfumesTab } from "../tabs/PerfumesTab";
import { PerfumeFormDialog } from "../dialogs/PerfumeFormDialog";

/**
 * المكوّن الرئيسي لصفحة العطور.
 * يحمّل العطور عند التركيب، ويعيد تحميلها كذلك عند بثّ الحدث "stock-mutated".
 */
export default function PerfumesPage() {
  const perfumesApi = usePerfumes();

  // جلب العطور مرة واحدة عند أول تحميل للصفحة
  useEffect(() => {
    perfumesApi.loadPerfumes();
  }, []);

  // الاشتراك في حدث تغيّر المخزون عبر ناقل الأحداث الإداري: أي تعديل للمخزون من شاشة
  // أخرى يؤدي إلى إعادة تحميل قائمة العطور هنا حتى تبقى الأرقام محدّثة دون تحديث الصفحة
  useAdminEvent("stock-mutated", () => {
    perfumesApi.loadPerfumes();
  });

  return (
    <>
      <PerfumesTab perfumesApi={perfumesApi} />
      <PerfumeFormDialog perfumesApi={perfumesApi} />
    </>
  );
}
