/**
 * ============================================================================
 * صفحة إعادة التوجيه إلى لوحة التحكم (Admin Redirect) — المسار: /admin
 * ----------------------------------------------------------------------------
 * صفحة وسيطة لا تعرض محتوى حقيقيًا؛ وظيفتها تحويل المستخدم تلقائيًا إلى لوحة
 * تحكم المشرف التي تعمل على نطاق فرعي (subdomain) منفصل:
 *   - أثناء التطوير: admin.localhost
 *   - في الإنتاج: admin.shama.ly
 * تعرض مؤشّر تحميل (spinner) ريثما يتم التحويل.
 * ============================================================================
 */
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * المكوّن الرئيسي: ينفّذ إعادة التوجيه فور تحميل الصفحة عبر useEffect.
 */
export default function AdminRedirect() {
  const { t } = useLanguage();

  // عند أول عرض للصفحة: اختر وجهة التحويل حسب بيئة التشغيل (تطوير أم إنتاج)
  useEffect(() => {
    if (import.meta.env.DEV) {
      // بيئة التطوير: التوجيه إلى النطاق الفرعي المحلي مع الحفاظ على رقم المنفذ (port)
      window.location.assign(
        `http://admin.localhost:${window.location.port}/`
      );
    } else {
      // بيئة الإنتاج: التوجيه إلى نطاق لوحة التحكم الفعلي
      window.location.assign("https://admin.shama.ly");
    }
  }, []);

  // واجهة مؤقتة: مؤشّر دوّار ورسالة "جاري التحويل" تظهر للحظات قبل اكتمال التوجيه
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] dark:bg-[#1a2235] text-[#323D50] dark:text-[#F5F5F5]">
      <div className="glass-card p-8 rounded-2xl text-center max-w-sm">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-[#5B8DD9]/20 border-t-[#5B8DD9] animate-spin" />
        <p className="text-base font-medium">{t("admin.redirect.message")}</p>
      </div>
    </div>
  );
}
