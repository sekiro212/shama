/**
 * supabase.ts — تهيئة عميل Supabase المشترك + أنواع قاعدة البيانات.
 *
 * ينشئ نسخة (singleton) واحدة من عميل Supabase تُستخدم في كل أنحاء الواجهة
 * (الاستعلامات والمصادقة والتخزين)، ويصدّر أنواع TypeScript لجداول الطلبات.
 */
import { createClient } from "@supabase/supabase-js";

// عنوان المشروع ومفتاح anon العام يُقرآن من متغيرات بيئة Vite؛ تُستخدم "error"
// كقيمة احتياطية حتى يفشل الطلب بوضوح إن لم تُضبط المتغيرات.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "error";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "error";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,        // حفظ الجلسة بين عمليات إعادة التحميل
    storageKey: "shama-auth",    // مفتاح localStorage المخصص لجلسة هذا المشروع
    autoRefreshToken: true,      // تجديد رمز الوصول تلقائياً قبل انتهائه
    detectSessionInUrl: true,    // التقاط الجلسة من رابط إعادة التوجيه (OAuth/OTP)
  },
});

// Types for our database
/** يمثّل سجل طلب واحد في جدول `orders` (snake_case كما في قاعدة البيانات). */
export interface Order {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  place_name?: string;
  total: number;
  order_date: string;
  items: OrderItem[];
  status?: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "accepted" | "returned";
  processed_at?: string;
  created_at?: string;
  updated_at?: string;
}

/** يمثّل عنصراً واحداً ضمن الطلب (محفوظ في عمود JSONB `items`). */
export interface OrderItem {
  id: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
  image: string;
}
