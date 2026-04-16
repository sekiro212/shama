import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminPage from "@/pages/admin/AdminPage";

export default function AdminRedirect() {
  const { t } = useLanguage();
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!isDev) {
      window.location.assign("https://admin.shama.ly");
    }
  }, [isDev]);

  if (isDev) {
    return <AdminPage />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] dark:bg-[#1a2235] text-[#323D50] dark:text-[#F5F5F5]">
      <div className="glass-card p-8 rounded-2xl text-center max-w-sm">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-[#5B8DD9]/20 border-t-[#5B8DD9] animate-spin" />
        <p className="text-base font-medium">{t("admin.redirect.message")}</p>
      </div>
    </div>
  );
}
