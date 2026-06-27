/**
 * ThemeContext.tsx
 * -------------------------------------------------------------------------
 * حالة السمة الفاتحة/الداكنة للتطبيق. تم ضبط Tailwind للوضع الداكن
 * المعتمد على الصنف (class-based)، لذا يبدّل هذا الـ provider الصنف `dark`
 * على عنصر <html> ويحفظ اختيار المستخدم في localStorage (الافتراضي داكن).
 * يُستهلك عبر الـ hook المسمى `useTheme()`.
 * -------------------------------------------------------------------------
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

/**
 * Provider يحتفظ بالسمة النشطة ويزامن الصنف `dark` على <html>
 * ويحفظ الاختيار. الافتراضي داكن ما لم تكن "light" قد حُفظت.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // استعادة السمة المحفوظة من localStorage (الافتراضي: داكن).
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("shama-theme");
    return saved === "light" ? "light" : "dark";
  });

  const isDark = theme === "dark";

  // عكس السمة كصنف على <html> (الوضع الداكن المعتمد على الصنف في Tailwind)
  // وحفظها بحيث يبقى الاختيار بعد إعادة التحميل.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("shama-theme", theme);
  }, [theme]);

  /** التبديل بين الفاتح والداكن. */
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook للوصول إلى سياق السمة (theme context).
 * يطلق خطأً إذا استُخدم خارج `ThemeProvider`.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
