/**
 * LanguageContext.tsx
 * -------------------------------------------------------------------------
 * التدويل (i18n) للمتجر ثنائي اللغة: الإنجليزية (LTR، الافتراضية)
 * والعربية (RTL). يوفّر دالة الترجمة `t(key)` واللغة الحالية وأعلام RTL
 * المستخدمة في كامل واجهة المستخدم.
 *
 * تُحفظ اللغة المختارة في localStorage وتُطبّق على عنصر <html>
 * (عبر `dir`/`lang`) بحيث يقلب المستند بأكمله اتجاهه عند العربية.
 * نصوص الترجمة موجودة في src/locales/{en,ar}.json.
 * يُستهلك عبر الـ hook المسمى `useLanguage()`.
 * -------------------------------------------------------------------------
 */
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

/**
 * تحلّ مفتاحًا مفصولًا بنقاط (مثل "nav.home") مقابل كائن ترجمة متداخل.
 * تُعيد النص إن وُجد، وإلا تُعيد undefined — مما يتيح للمستدعي اللجوء
 * إلى لغة أخرى أو إلى المفتاح الخام.
 */
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

/**
 * Provider يحتفظ باللغة النشطة ويحفظها ويعرض دالة الترجمة `t()`
 * إضافةً إلى أعلام RTL. الافتراضي هو الإنجليزية ما لم تكن العربية
 * قد حُفظت سابقًا.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  // استعادة آخر لغة مختارة من localStorage (الافتراضي: الإنجليزية).
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("shama-language");
    return saved === "ar" ? "ar" : "en";
  });

  // العربية هي اللغة الوحيدة RTL هنا؛ تُغذّي `dir` خاصية عنصر <html>.
  const isRTL = language === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  // تطبيق الاتجاه/اللغة على جذر المستند وحفظ الاختيار بحيث تنقلب
  // الصفحة بأكملها (خصائص CSS المنطقية والتخطيط) عند العربية.
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    localStorage.setItem("shama-language", language);
  }, [language, dir]);

  /** تبديل اللغة النشطة (يُشغّل الحفظ وتحديث المستند). */
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  /**
   * تترجم مفتاحًا بمسار نقطي إلى اللغة الحالية.
   * ترتيب الحل: اللغة الحالية ← اللجوء إلى الإنجليزية ← المفتاح نفسه
   * (بحيث تظهر الترجمات المفقودة بدلًا من أن تكون فارغة).
   */
  const t = useCallback(
    (key: string): string => {
      const value = getNestedValue(translations[language] as Record<string, unknown>, key);
      if (value !== undefined) return value;
      // اللجوء إلى الإنجليزية
      const fallback = getNestedValue(translations.en as Record<string, unknown>, key);
      if (fallback !== undefined) return fallback;
      // الملاذ الأخير: إعادة المفتاح
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

/**
 * Hook للوصول إلى الترجمة وحالة RTL.
 * يطلق خطأً إذا استُخدم خارج `LanguageProvider`.
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
