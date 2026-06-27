/**
 * AdminAuthContext.tsx
 * -------------------------------------------------------------------------
 * React context لنظام مصادقة المسؤول (ADMIN) المنفصل عن مصادقة المستخدم
 * العادي في AuthContext.tsx. يسجّل المسؤولون الدخول باسم مستخدم + كلمة مرور
 * نصية صريحة يتم التحقق منها مقابل جدول `users` في Supabase؛ ثم يُحفظ الـ
 * session الناتج في localStorage بواسطة `authService`.
 *
 * يغلّف هذا الـ context تلك الخدمة لتتمكن صفحات المسؤول من قراءة حالة
 * المصادقة واستدعاء login/logout/refresh عبر الـ hook المسمى
 * `useAdminAuth()`. وهو يشغّل التطبيق المصغّر `/admin` الذي يعرض LoginDialog
 * كلما لم يكن هناك مسؤول مسجّل.
 * -------------------------------------------------------------------------
 */
import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import {
  authenticateAdmin,
  getCurrentAdmin,
  isAdminAuthenticated,
  logoutAdmin,
  refreshAuthentication,
  type AuthResponse,
  type LoginCredentials,
  type User,
} from "@/services/authService";

interface AdminAuthContextType {
  admin: User | null;
  isAuthenticated: boolean;
  login: (creds: LoginCredentials) => Promise<AuthResponse>;
  logout: () => void;
  refresh: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

/**
 * Provider يعرض حالة مصادقة المسؤول وإجراءاتها لشجرة تطبيق المسؤول.
 * يحتفظ بالمستخدم المسؤول الحالي ويشتق منه `isAuthenticated`.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  // تهيئة الحالة بشكل متزامن من localStorage لتجنّب وميض LoginDialog عند التحميل.
  const [admin, setAdmin] = useState<User | null>(() =>
    isAdminAuthenticated() ? getCurrentAdmin() : null
  );

  // التحقق من بيانات الاعتماد عبر الخدمة؛ عند النجاح يُخزَّن المستخدم لتعيد
  // واجهة المستخدم العرض في حالة المصادقة. تُعيد النتيجة الخام لتتمكن
  // LoginDialog من عرض رسالة خطأ عند الفشل.
  const login = useCallback(async (creds: LoginCredentials): Promise<AuthResponse> => {
    const result = await authenticateAdmin(creds);
    if (result.success && result.user) {
      setAdmin(result.user);
    }
    return result;
  }, []);

  // مسح الـ session المحفوظ (localStorage) وإعادة ضبط الحالة في الذاكرة.
  const logout = useCallback(() => {
    logoutAdmin();
    setAdmin(null);
  }, []);

  // تمديد/تجديد الطابع الزمني للـ session المخزَّن دون مطالبة المستخدم بتسجيل الدخول من جديد.
  const refresh = useCallback(() => {
    refreshAuthentication();
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ admin, isAuthenticated: admin !== null, login, logout, refresh }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

/**
 * Hook لاستهلاك سياق مصادقة المسؤول (admin auth context).
 * يطلق خطأً إذا استُخدم خارج `AdminAuthProvider` لاكتشاف أخطاء الربط مبكرًا.
 */
export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return ctx;
}
