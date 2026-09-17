/**
 * LanguageContext.tsx
 * -------------------------------------------------------------------------
 * التدويل (i18n) للمتجر ثنائي اللغة: العربية (RTL، الافتراضية)
 * والإنجليزية (LTR). يوفّر دالة الترجمة `t(key)` واللغة الحالية وأعلام RTL
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
 * Provider يحتفظ باللغة النشطة ويعرض دالة الترجمة `t()` إضافةً إلى أعلام
 * RTL. الافتراضي هو العربية دائمًا، ولا تُستعمل الإنجليزية إلا إذا بدّلها
 * الزائر بنفسه — ولغة المتصفّح لا دخل لها.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  // العربية هي الافتراض غير المشروط، ولا يُخرج عنه إلا تبديلٌ صريح من الزائر.
  //
  // كانت لغة المتصفّح تُحترَم سابقًا، فيحصل الزائر ذو المتصفّح الإنجليزي على
  // الإنجليزية. لكنّ كثيرًا من الليبيين هواتفهم مضبوطة على الإنجليزية وهم
  // يقرأون العربية، فكان ذلك يعطي أغلب السوق لغةً لا يريدها.
  //
  // المفتاح جديد (`shama-lang-choice`) عن قصد: المفتاح القديم كان يُكتب في كل
  // تحميلٍ للصفحة، فحُفظت "en" لزوّارٍ لم يختاروها قطّ — ولا سبيل للتمييز بين
  // تلك القيمة وبين اختيارٍ حقيقي. المفتاح الجديد لا يُكتب إلا من `setLanguage`،
  // فوجودُه يعني اختيارًا صريحًا، ومن اختار الإنجليزية فعلًا يبقى عليها.
  const [language, setLanguageState] = useState<Language>(() => {
    const chosen = localStorage.getItem("shama-lang-choice");
    return chosen === "en" ? "en" : "ar";
  });

  // العربية هي اللغة الوحيدة RTL هنا؛ تُغذّي `dir` خاصية عنصر <html>.
  const isRTL = language === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  // تطبيق الاتجاه/اللغة على جذر المستند بحيث تنقلب الصفحة بأكملها
  // (خصائص CSS المنطقية والتخطيط) عند العربية. لا حفظ هنا: الحفظ في
  // `setLanguage` وحده حتى يبقى المفتاح دليلًا على اختيارٍ صريح.
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  /** تبديل اللغة النشطة وتسجيل الاختيار (وهذا الموضع الوحيد الذي يكتب المفتاح). */
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("shama-lang-choice", lang);
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
