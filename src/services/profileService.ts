/**
 * ===========================================================================
 * ملف: profileService.ts
 * الغرض: حفظ وجلب بيانات الشحن الافتراضية للمستخدم المسجَّل (جدول user_profiles)
 * كي تُعبَّأ تلقائيًا في صفحة الدفع في كل مرة. صف واحد لكل مستخدم (user_id مفتاح).
 * محميّ بـ RLS: كل مستخدم يقرأ/يكتب صفه فقط.
 * ===========================================================================
 */
import { supabase } from "@/lib/supabase";

export interface UserProfile {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  place_name?: string | null;
  vanex_city_id?: number | null;
  vanex_sub_city_id?: number | null;
  updated_at?: string;
}

// الحقول القابلة للحفظ (دون المفاتيح/الطوابع الزمنية)
export type UserProfileInput = Omit<UserProfile, "user_id" | "updated_at">;

/**
 * جلب ملف الشحن الافتراضي للمستخدم.
 * @param userId معرّف المستخدم.
 * @returns الملف الشخصي، أو null إن لم يوجد أو عند الخطأ.
 */
export const getUserProfile = async (
  userId: string
): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

/**
 * حفظ/تحديث ملف الشحن الافتراضي للمستخدم (upsert على user_id).
 * يُستدعى بعد إتمام الطلب لتذكّر بيانات الشحن للمرة القادمة.
 * غير حابس: لا يُفشل الطلب إن أخفق الحفظ.
 * @param userId معرّف المستخدم.
 * @param profile بيانات الشحن المراد حفظها.
 * @returns true عند النجاح، أو false عند الفشل.
 */
export const upsertUserProfile = async (
  userId: string,
  profile: UserProfileInput
): Promise<boolean> => {
  try {
    const { error } = await supabase.from("user_profiles").upsert(
      {
        user_id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Error saving user profile:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error saving user profile:", error);
    return false;
  }
};
