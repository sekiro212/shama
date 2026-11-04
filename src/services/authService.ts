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
  /** رمز موقَّع من admin-auth تتحقّق منه الدوال الطرفية للعمليات الإدارية. */
  token?: string;
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
    // التحقق يجري في دالة طرفية (supabase/functions/admin-auth) بمفتاح الخدمة.
    //
    // كان هذا الاستعلام يعمل في المتصفّح مباشرةً:
    //   .from("users").eq("username", …).eq("password", …)
    // وهو يستلزم أن يكون جدول users مقروءًا بمفتاح anon — والمفتاح منشور داخل
    // حزمة الموقع، فكان أي زائر يستطيع قراءة كل صفوف المسؤولين بكلمات مرورها
    // نصًّا صريحًا. كلمة المرور الآن لا تغادر قاعدة البيانات.
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      }
    );

    const body = (await res.json().catch(() => null)) as AuthResponse | null;

    if (!res.ok || !body?.success || !body.user) {
      return {
        success: false,
        error: body?.error ?? "Invalid username or password",
      };
    }

    // تخزين الجلسة في localStorage مع طابع زمني يُستخدم لاحقًا لحساب انتهاء الصلاحية.
    // الكائن المُخزَّن لا يحوي كلمة المرور — الدالة الطرفية تحذفها قبل الإرجاع.
    // يُحفظ الرمز مع الجلسة: vanex-proxy ترفض الإنشاء/الإلغاء/الاسترجاع بدونه،
    // فعَلَم في localStorage وحده لا يُثبت شيئًا للخادم.
    localStorage.setItem(
      "admin_auth",
      JSON.stringify({
        user: body.user,
        token: body.token,
        timestamp: new Date().getTime(),
      })
    );

    return { success: true, user: body.user, token: body.token };
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
