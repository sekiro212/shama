import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Globe, LogOut, Lock, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

function AdminTopBar() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { logout, isAuthenticated } = useAdminAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-[#323D50]/10 dark:border-white/10 bg-[#F8F9FB]/80 dark:bg-[#1a2235]/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] flex items-center justify-center text-white font-bold shadow-sm">
            S
          </div>
          <span className="font-semibold text-[#323D50] dark:text-white text-base">
            {t("admin.shell.title")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={toggleTheme}
            variant="ghost"
            size="icon"
            className="glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20 border dark:border-white/10 border-[#323D50]/10 rounded-xl w-10 h-10"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Button
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            variant="ghost"
            className="glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20 border dark:border-white/10 border-[#323D50]/10 rounded-xl px-3 h-10 text-sm font-semibold"
          >
            <Globe className="w-4 h-4 me-1.5" />
            {language === "en" ? "AR" : "EN"}
          </Button>

          {isAuthenticated && (
            <Button
              onClick={() => {
                logout();
                toast.success(t("admin.logoutSuccess"));
              }}
              variant="ghost"
              className="glass dark:bg-white/5 bg-red-500/10 dark:hover:bg-red-500/20 hover:bg-red-500/20 border dark:border-white/10 border-[#323D50]/10 rounded-xl px-3 h-10 text-sm font-semibold text-red-600 dark:text-red-400"
            >
              <LogOut className="w-4 h-4 me-1.5" />
              {t("admin.shell.logout")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function AdminLoginGate() {
  const { t } = useLanguage();
  const { login } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) return;
    setLoading(true);
    const result = await login({ username, password });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error || t("admin.shell.loginError"));
    } else {
      toast.success(t("admin.login.loginSuccess"));
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="glass-card p-8 rounded-2xl w-full max-w-md bg-white/60 dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10">
        <div className="text-center mb-6">
          <Lock className="w-10 h-10 mx-auto mb-3 text-[#5B8DD9]" />
          <h1 className="text-2xl font-bold gradient-text">{t("admin.shell.loginTitle")}</h1>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-shell-username" className="text-[#323D50] dark:text-white/80">
              {t("admin.shell.usernameLabel")}
            </Label>
            <Input
              id="admin-shell-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
              placeholder={t("admin.login.enterUsername")}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-shell-password" className="text-[#323D50] dark:text-white/80">
              {t("admin.shell.passwordLabel")}
            </Label>
            <Input
              id="admin-shell-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
              placeholder={t("admin.login.enterPassword")}
              disabled={loading}
            />
          </div>

          <LoadingButton
            onClick={handleSubmit}
            loading={loading}
            loadingText={t("admin.login.loggingIn")}
            disabled={!username || !password}
            className="w-full bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
          >
            {t("admin.shell.loginButton")}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAdminAuth();

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] text-[#323D50] dark:text-[#F5F5F5] w-full overflow-x-hidden">
      <AdminTopBar />
      {isAuthenticated ? <main>{children}</main> : <AdminLoginGate />}
    </div>
  );
}
