import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import en from "@/locales/en.json";
import ar from "@/locales/ar.json";

type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  dir: "ltr" | "rtl";
}

const translations: Record<Language, Record<string, unknown>> = { en, ar };

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("shama-language");
    return saved === "ar" ? "ar" : "en";
  });

  const isRTL = language === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    localStorage.setItem("shama-language", language);
  }, [language, dir]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const value = getNestedValue(translations[language] as Record<string, unknown>, key);
      if (value !== undefined) return value;
      // Fallback to English
      const fallback = getNestedValue(translations.en as Record<string, unknown>, key);
      if (fallback !== undefined) return fallback;
      // Last resort: return the key
      return key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
