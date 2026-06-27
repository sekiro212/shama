/**
 * ===========================================================================
 * ملف: memoriesService.ts
 * الغرض: خدمة "الذكريات" المرتبطة بالعطور (قصص يكتبها المستخدمون عن عطر معيّن).
 * يتعامل مع جدول memories ويغطّي: جلب الذكريات المعتمدة، إرسال ذكرى جديدة،
 * وعمليات الإشراف (جلب الكل، الاعتماد، الحذف، عدّ المعلّقة).
 * حالة الذكرى (status): "pending" بانتظار الموافقة أو "approved" معتمدة.
 * ===========================================================================
 */
import { supabase } from "@/lib/supabase";

export interface Memory {
  id: string;
  perfume_id: string | null;
  perfume_name: string;
  memory_text: string;
  author_name?: string;
  status: "pending" | "approved";
  created_at: string;
}

/**
 * جلب الذكريات المعتمدة للعرض العام (أحدث 40 ذكرى).
 * @returns مصفوفة الذكريات المعتمدة مرتّبة من الأحدث، أو مصفوفة فارغة عند الخطأ.
 */
export const fetchApprovedMemories = async (): Promise<Memory[]> => {
  // عرض المعتمدة فقط، مرتّبة تنازليًا حسب تاريخ الإنشاء، مع حد أقصى 40 سجلًا
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) {
    console.error("Error fetching memories:", error);
    return [];
  }
  return data || [];
};

/**
 * إرسال ذكرى جديدة من المستخدم.
 * تُحفظ دائمًا بحالة "pending" بانتظار اعتماد المسؤول قبل ظهورها للعامة.
 * @param payload بيانات الذكرى: معرّف العطر واسمه، نص الذكرى، واسم الكاتب (اختياري).
 */
export const submitMemory = async (payload: {
  perfume_id: string;
  perfume_name: string;
  memory_text: string;
  author_name?: string;
}): Promise<void> => {
  // فرض الحالة "pending" بصرف النظر عن المُدخل لضمان مرورها بمرحلة الإشراف
  const { error } = await supabase.from("memories").insert([
    { ...payload, status: "pending" },
  ]);
  if (error) throw error;
};

/**
 * جلب جميع الذكريات (معتمدة ومعلّقة) لاستخدامها في لوحة الإشراف.
 * @returns كل الذكريات مرتّبة من الأحدث، أو مصفوفة فارغة عند الخطأ.
 */
export const fetchAllMemories = async (): Promise<Memory[]> => {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching all memories:", error);
    return [];
  }
  return data || [];
};

/**
 * اعتماد ذكرى معلّقة (تغيير حالتها إلى "approved") لتظهر للعامة.
 * @param id معرّف الذكرى المراد اعتمادها.
 */
export const approveMemory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("memories")
    .update({ status: "approved" })
    .eq("id", id);
  if (error) throw error;
};

/**
 * حذف ذكرى نهائيًا من قاعدة البيانات.
 * @param id معرّف الذكرى المراد حذفها.
 */
export const deleteMemory = async (id: string): Promise<void> => {
  const { error } = await supabase.from("memories").delete().eq("id", id);
  if (error) throw error;
};

/**
 * عدّ الذكريات المعلّقة (بانتظار الموافقة) لعرض شارة الإشعارات في لوحة الإشراف.
 * @returns عدد الذكريات المعلّقة، أو 0 عند الخطأ.
 */
export const fetchPendingMemoryCount = async (): Promise<number> => {
  // استخدام head: true مع count: "exact" لجلب العدد فقط دون تحميل بيانات الصفوف
  const { count, error } = await supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
};
