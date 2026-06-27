/**
 * AuthContext.tsx
 * -------------------------------------------------------------------------
 * React context لنظام مصادقة المتسوّق (SHOPPER) العادي، المدعوم بواسطة
 * Supabase Auth. يدعم التسجيل وتسجيل الدخول بالبريد الإلكتروني/كلمة المرور،
 * وتسجيل الدخول عبر Google OAuth، والتحقق عبر OTP (تأكيد البريد الإلكتروني /
 * استعادة كلمة المرور)، وإعادة تعيين كلمة المرور وتحديثها.
 *
 * يشترك في حالة المصادقة لدى Supabase ليبقى التطبيق بأكمله متزامنًا مع
 * المستخدم/الـ session الحالي، ويمرّر معرّف المستخدم (id) إلى خدمة تتبّع
 * التحليلات. يُستهلك عبر الـ hook المسمى `useAuth()`.
 *
 * ملاحظة: هذا مختلف عن مصادقة المسؤول في AdminAuthContext.tsx.
 * -------------------------------------------------------------------------
 */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { setTrackingUser } from "@/services/trackingService";

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  verifyOtp: (email: string, token: string, type: "signup" | "recovery") => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider يحمّل الـ session الحالي من Supabase ويبقيه محدّثًا، ويعرض
 * إجراءات المصادقة للتطبيق. تكون قيمة `loading` صحيحة حتى يكتمل البحث
 * الأولي عن الـ session، بحيث يمكن للحُرّاس (guards) تجنّب وميض واجهة
 * المستخدم في حالة عدم تسجيل الدخول.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // تبقى صحيحة حتى يكتمل أول استدعاء لـ getSession()؛ تمنع وميض واجهة المستخدم.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) قراءة أي session محفوظ مرة واحدة عند التحميل (عند فتح الصفحة / إعادة تحميلها).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setTrackingUser(session?.user?.id ?? null);
      setLoading(false);
    });

    // 2) الاشتراك في تغييرات المصادقة المستقبلية (login، logout، تحديث token،
    //    العودة من إعادة توجيه OAuth) ليبقى حالة الـ context متزامنة في كل مكان.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setTrackingUser(session?.user?.id ?? null);
    });

    // إلغاء الاشتراك عند إزالة المكوّن (unmount) لتجنّب التسريبات / تكرار المستمعين.
    return () => subscription.unsubscribe();
  }, []);

  /** إنشاء حساب جديد بالبريد الإلكتروني + كلمة المرور. يرسل Supabase رسالة OTP/تأكيد بالبريد. */
  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  /** تسجيل الدخول بالبريد الإلكتروني + كلمة المرور. يحدّث مستمع المصادقة الـ context عند النجاح. */
  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  /**
   * بدء تدفق Google OAuth. يعيد التوجيه إلى Google ثم يعود إلى أصل (origin)
   * التطبيق؛ بعدها يلتقط مستمع المصادقة الـ session الناتج.
   */
  const signInWithGoogle = async (): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // إعادة المستخدم إلى أصل (origin) الموقع الحالي بعد مصادقة Google.
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  /**
   * التحقق من رمز لمرة واحدة (OTP) مُرسَل إلى بريد المستخدم.
   * @param type قيمة "signup" تؤكّد حسابًا جديدًا، و"recovery" لإعادة تعيين كلمة المرور.
   * يحوّل نوعنا المبسّط إلى نوع OTP الخاص بـ Supabase ("email" مقابل "recovery").
   */
  const verifyOtp = async (email: string, token: string, type: "signup" | "recovery"): Promise<AuthResult> => {
    const otpType = type === "signup" ? "email" : "recovery";
    const { error } = await supabase.auth.verifyOtp({ email, token, type: otpType });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  /** إرسال بريد استعادة كلمة المرور ليتمكن المستخدم من تعيين كلمة مرور جديدة. */
  const resetPassword = async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  /** تعيين كلمة مرور جديدة للـ session الحالي المسجّل دخوله (أو session الاستعادة). */
  const updatePassword = async (password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  /** تسجيل خروج المستخدم؛ يمسح مستمع المصادقة المستخدم/الـ session من الـ context. */
  const signOutUser = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, loading,
        signUp, signIn, signInWithGoogle, signOut: signOutUser,
        verifyOtp, resetPassword, updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook للوصول إلى سياق مصادقة المتسوّق (user، session، loading، والإجراءات).
 * يطلق خطأً إذا استُخدم خارج `AuthProvider`.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
