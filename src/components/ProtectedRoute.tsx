import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Lock } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

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

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
