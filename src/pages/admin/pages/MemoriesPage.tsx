/**
 * ملف: MemoriesPage.tsx
 * الدور: صفحة هدف المسار الخاصة بـ"الذكريات" في لوحة التحكم (/admin/memories).
 * غلاف رفيع يربط خطّاف بيانات الذكريات بواجهة عرضها وإدارتها (موافقة/حذف).
 */
import { useEffect } from "react";
import { useMemories } from "../hooks/useMemories";
import { MemoriesTab } from "../tabs/MemoriesTab";

/**
 * المكوّن الرئيسي لصفحة الذكريات.
 * يحمّل الذكريات عند التركيب ثم يمرّرها إلى مكوّن العرض MemoriesTab.
 */
export default function MemoriesPage() {
  const memoriesApi = useMemories();

  // جلب الذكريات مرة واحدة عند أول تحميل للصفحة
  useEffect(() => {
    memoriesApi.loadMemories();
  }, []);

  return <MemoriesTab memoriesApi={memoriesApi} />;
}
