/**
 * LoginDialog.tsx
 * ---------------
 * نافذة تسجيل دخول المسؤول. المسار /admin غير محميّ بـ ProtectedRoute؛ بدلًا من
 * ذلك، عند عدم وجود جلسة مسؤول يعرض غلاف الإدارة هذه النافذة.
 * تجمع اسم مستخدم + كلمة مرور وتسلّمهما إلى المكوّن الأب عبر `onLogin`.
 * فحص بيانات الاعتماد الفعلي (مقابل جدول `users` في Supabase) موجود في
 * authService.ts — وهذا المكوّن ليس إلا النموذج. الحالة (بيانات الاعتماد،
 * التحميل) يملكها المكوّن الأب / AdminAuthContext وتُمرَّر كخصائص (props).
 */
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { LoginCredentials } from "@/services/authService";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loginCredentials: LoginCredentials;
  setLoginCredentials: (updater: (prev: LoginCredentials) => LoginCredentials) => void;
  loginLoading: boolean;
  onLogin: () => void;
}

/**
 * يعرض نافذة نموذج تسجيل دخول المسؤول.
 * الخصائص (props) الأساسية:
 * - open / onOpenChange: التحكّم في ظهور النافذة والإبلاغ عنه
 * - loginCredentials / setLoginCredentials: حالة اسم المستخدم+كلمة المرور المتحكَّم بها
 * - loginLoading: يُعطّل المدخلات ويعرض مؤشّر تحميل (spinner) أثناء المصادقة
 * - onLogin: يُطلق فحص المصادقة (التحقق من بيانات الاعتماد مقابل Supabase)
 */
export function LoginDialog({
  open,
  onOpenChange,
  loginCredentials,
  setLoginCredentials,
  loginLoading,
  onLogin,
}: LoginDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="gradient-text text-center">
            <Lock className="w-8 h-8 mx-auto mb-2" />
            {t("admin.login.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-[#323D50] dark:text-white/80">
              {t("admin.login.username")}
            </Label>
            {/* حقل اسم مستخدم متحكَّم به، يبقى متزامنًا مع حالة بيانات اعتماد المكوّن الأب. */}
            <Input
              id="username"
              type="text"
              value={loginCredentials.username}
              onChange={(e) =>
                setLoginCredentials((prev) => ({
                  ...prev,
                  username: e.target.value,
                }))
              }
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
              placeholder={t("admin.login.enterUsername")}
              disabled={loginLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#323D50] dark:text-white/80">
              {t("admin.login.password")}
            </Label>
            <Input
              id="password"
              type="password"
              value={loginCredentials.password}
              onChange={(e) =>
                setLoginCredentials((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
              placeholder={t("admin.login.enterPassword")}
              disabled={loginLoading}
              // الضغط على Enter في حقل كلمة المرور يرسل تسجيل الدخول.
              onKeyDown={(e) => e.key === "Enter" && onLogin()}
            />
          </div>

          {/* زر الإرسال معطّل حتى يُملأ الحقلان كلاهما. */}
          <LoadingButton
            onClick={onLogin}
            loading={loginLoading}
            loadingText={t("admin.login.loggingIn")}
            disabled={!loginCredentials.username || !loginCredentials.password}
            className="w-full bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
          >
            {t("admin.login.loginButton")}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
