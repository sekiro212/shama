import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Bell, BellOff, Globe, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface EmailPrefs {
  email_enabled: boolean;
  new_product_alerts: boolean;
  weekly_digest: boolean;
  monthly_digest: boolean;
  re_engagement: boolean;
  language_pref: "en" | "ar";
}

const defaultPrefs: EmailPrefs = {
  email_enabled: true,
  new_product_alerts: true,
  weekly_digest: false,
  monthly_digest: true,
  re_engagement: true,
  language_pref: "en",
};

export default function EmailPreferencesPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [prefs, setPrefs] = useState<EmailPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadPrefs = async () => {
      try {
        const { data, error } = await supabase
          .from("email_preferences")
          .select("email_enabled, new_product_alerts, weekly_digest, monthly_digest, re_engagement, language_pref")
          .eq("user_id", user.id)
          .single();

        if (error && error.code === "PGRST116") {
          // No row yet — upsert defaults
          const langPref = language === "ar" ? "ar" : "en";
          await supabase.from("email_preferences").upsert({
            user_id: user.id,
            ...defaultPrefs,
            language_pref: langPref,
          });
          setPrefs({ ...defaultPrefs, language_pref: langPref });
        } else if (data) {
          setPrefs(data as EmailPrefs);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    loadPrefs();
  // language is only used for the first-time default; don't refetch on language switch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updatePref = async (key: keyof EmailPrefs, value: boolean | string) => {
    if (!user) return;

    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    setSaving(true);

    try {
      const { error } = await supabase
        .from("email_preferences")
        .update({ [key]: value })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success(t("settings.saved"));
    } catch {
      setPrefs(prefs); // revert
      toast.error(t("settings.error"));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-[80px] md:pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto text-center py-20">
          <Mail className="w-16 h-16 text-[#5B8DD9]/30 mx-auto mb-6" />
          <h2 className="text-xl font-bold text-[#323D50] dark:text-white mb-3">
            {t("settings.loginRequired")}
          </h2>
          <Button asChild className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl px-6 py-3 mt-4">
            <Link to="/login">{t("auth.login")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-[80px] md:pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#6B7B8D]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t("settings.loading")}</span>
        </div>
      </div>
    );
  }

  const toggleItems = [
    { key: "new_product_alerts" as const, label: t("settings.newProducts"), desc: t("settings.newProductsDesc"), icon: Bell },
    { key: "weekly_digest" as const, label: t("settings.weeklyDigest"), desc: t("settings.weeklyDigestDesc"), icon: Mail },
    { key: "monthly_digest" as const, label: t("settings.monthlyDigest"), desc: t("settings.monthlyDigestDesc"), icon: Mail },
    { key: "re_engagement" as const, label: t("settings.reEngagement"), desc: t("settings.reEngagementDesc"), icon: BellOff },
  ];

  return (
    <div className="min-h-screen pt-[80px] md:pt-24 pb-16 px-4">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Mail className="w-6 h-6 text-[#5B8DD9]" />
            <h1 className="text-3xl md:text-4xl font-bold gradient-text">
              {t("settings.title")}
            </h1>
          </div>
          <p className="text-[#6B7B8D] dark:text-white/50 text-sm">
            {t("settings.subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Master toggle */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Label className="text-[#323D50] dark:text-white font-semibold">
                    {t("settings.masterToggle")}
                  </Label>
                  <p className="text-xs text-[#6B7B8D] dark:text-white/50">
                    {t("settings.masterToggleDesc")}
                  </p>
                </div>
              </div>
              <Switch
                checked={prefs.email_enabled}
                onCheckedChange={(v) => updatePref("email_enabled", v)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Individual toggles */}
          <div className={`glass-card p-6 rounded-2xl space-y-5 transition-opacity ${!prefs.email_enabled ? "opacity-50 pointer-events-none" : ""}`}>
            {toggleItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-[#5B8DD9]" />
                  <div>
                    <Label className="text-[#323D50] dark:text-white font-medium text-sm">
                      {item.label}
                    </Label>
                    <p className="text-xs text-[#6B7B8D] dark:text-white/50">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs[item.key]}
                  onCheckedChange={(v) => updatePref(item.key, v)}
                  disabled={saving}
                />
              </div>
            ))}
          </div>

          {/* Language preference */}
          <div className={`glass-card p-6 rounded-2xl transition-opacity ${!prefs.email_enabled ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-[#5B8DD9]" />
                <div>
                  <Label className="text-[#323D50] dark:text-white font-medium text-sm">
                    {t("settings.language")}
                  </Label>
                  <p className="text-xs text-[#6B7B8D] dark:text-white/50">
                    {t("settings.languageDesc")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updatePref("language_pref", "en")}
                  disabled={saving}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    prefs.language_pref === "en"
                      ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white"
                      : "bg-[#323D50]/10 dark:bg-white/10 text-[#6B7B8D]"
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => updatePref("language_pref", "ar")}
                  disabled={saving}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    prefs.language_pref === "ar"
                      ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white"
                      : "bg-[#323D50]/10 dark:bg-white/10 text-[#6B7B8D]"
                  }`}
                >
                  العربية
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
