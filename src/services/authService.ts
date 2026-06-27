/**
 * ===========================================================================
 * ملف: authService.ts
 * الغرض: خدمة مصادقة المسؤول (admin) فقط.
 * تتحقق من اسم المستخدم وكلمة المرور مقابل جدول "users" في Supabase،
 * وتخزّن الجلسة في localStorage مع طابع زمني لانتهاء الصلاحية بعد 24 ساعة.
 * ملاحظة: هذا النظام منفصل تمامًا عن مصادقة المستخدم العادي (Supabase Auth).
 * ===========================================================================
 */
import { supabase } from "@/lib/supabase";

export interface User {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * مصادقة المسؤول: تتحقق من بيانات الدخول مقابل قاعدة البيانات.
 * @param credentials اسم المستخدم وكلمة المرور المُدخلان.
 * @returns كائن يحتوي على success وبيانات المستخدم عند النجاح، أو رسالة خطأ عند الفشل.
 */
export const authenticateAdmin = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  try {
    // مطابقة اسم المستخدم وكلمة المرور معًا مع شرط أن يكون الحساب مفعّلًا (is_active)
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", credentials.username)
      .eq("password", credentials.password)
      .eq("is_active", true)
      .single();

    if (error) {
      // الرمز PGRST116 يعني أن single() لم يجد أي صف مطابق => بيانات دخول غير صحيحة
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Invalid username or password",
        };
      }
      return {
        success: false,
        error: "Authentication failed",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Invalid username or password",
      };
    }

    // تخزين الجلسة في localStorage مع طابع زمني يُستخدم لاحقًا لحساب انتهاء الصلاحية
    localStorage.setItem(
      "admin_auth",
      JSON.stringify({
        user: data,
        timestamp: new Date().getTime(),
      })
    );

    return {
      success: true,
      user: data,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      success: false,
      error: "Authentication failed",
    };
  }
};

/**
 * التحقق ممّا إذا كان المسؤول مسجّل الدخول حاليًا.
 * @returns true إذا وُجدت جلسة صالحة (لم تنتهِ صلاحيتها وللمستخدم دور admin مفعّل).
 */
export const isAdminAuthenticated = (): boolean => {
  try {
    const authData = localStorage.getItem("admin_auth");
    if (!authData) return false;

    const { user, timestamp } = JSON.parse(authData);
    const now = new Date().getTime();
    const authAge = now - timestamp;

    // انتهاء صلاحية الجلسة بعد 24 ساعة (محسوبة بالميلي ثانية)؛ تُحذف الجلسة عند الانتهاء
    if (authAge > 24 * 60 * 60 * 1000) {
      localStorage.removeItem("admin_auth");
      return false;
    }

    // الجلسة صالحة فقط إذا كان الدور admin والحساب مفعّلًا
    return user && user.role === "admin" && user.is_active;
  } catch (error) {
    console.error("Auth check error:", error);
    return false;
  }
};

/**
 * إرجاع بيانات المسؤول المسجّل حاليًا من الجلسة المخزّنة.
 * @returns كائن المستخدم، أو null إذا لم توجد جلسة.
 */
export const getCurrentAdmin = (): User | null => {
  try {
    const authData = localStorage.getItem("admin_auth");
    if (!authData) return null;

    const { user } = JSON.parse(authData);
    return user;
  } catch (error) {
    console.error("Get current admin error:", error);
    return null;
  }
};

/**
 * تسجيل خروج المسؤول بحذف الجلسة من localStorage.
 */
export const logoutAdmin = (): void => {
  localStorage.removeItem("admin_auth");
};

/**
 * تجديد الجلسة (تمديد صلاحيتها) بتحديث الطابع الزمني إلى الوقت الحالي مع الإبقاء على بيانات المستخدم.
 */
export const refreshAuthentication = (): void => {
  const authData = localStorage.getItem("admin_auth");
  if (authData) {
    const { user } = JSON.parse(authData);
    localStorage.setItem(
      "admin_auth",
      JSON.stringify({
        user,
        timestamp: new Date().getTime(),
      })
    );
  }
};
