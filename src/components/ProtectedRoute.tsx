/**
 * ProtectedRoute.tsx
 * ------------------
 * حارس المسارات (Route guard) للصفحات التي تتطلب تسجيل دخول المستخدم
 * (مثل /checkout و /my-orders). يُلَف عنصر المسار بـ <ProtectedRoute> داخل
 * App.tsx بحيث لا يصل إليه إلا المستخدمون المسجَّلون. يقرأ مستخدم Supabase
 * من AuthContext.
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Lock } from "lucide-react";

/**
 * يعرض `children` فقط عندما يكون المستخدم مسجّل الدخول.
 * @param children - الصفحة/العنصر المحمي الذي يُعرض بعد تأكيد المصادقة.
 * - أثناء تحميل حالة المصادقة (loading) يعرض شاشة انتظار لتفادي إعادة توجيه خاطفة.
 * - في حال عدم وجود مستخدم، يعيد التوجيه إلى /login ويحفظ المسار المطلوب في
 *   حالة الراوتر (state) كي تعيد عملية تسجيل الدخول المستخدم إلى حيث كان.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  // التحقق من المصادقة ما زال جارياً — نعرض بطاقة انتظار محايدة بدل إعادة
  // توجيه مؤقتة لمستخدم هو في الحقيقة مسجّل الدخول.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 rounded-2xl p-8 flex flex-col items-center gap-4">
          <Lock className="w-8 h-8 text-[#5B8DD9] animate-pulse" />
          <p className="dark:text-white/70 text-[#6B7B8D]">{t("auth.checkingAuth")}</p>
        </div>
      </div>
    );
  }

  // غير مصادَق عليه ← إعادة توجيه إلى تسجيل الدخول مع تمرير المسار المطلوب
  // أصلاً ليعيد إليه لاحقاً. استخدام `replace` يمنع تلويث سجل التصفّح (history).
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
