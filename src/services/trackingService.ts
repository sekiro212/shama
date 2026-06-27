/**
 * ===========================================================================
 * ملف: trackingService.ts
 * الغرض: تتبّع نشاط المستخدم وتسجيل الأحداث في جدول user_events لأغراض التحليل والتوصيات.
 * يحتفظ بمعرّف المستخدم الحالي في متغيّر داخلي، ولا يُسجّل أي حدث إن لم يكن المستخدم مسجّلًا.
 * التسجيل يتم بصمت (fire-and-forget) دون إيقاف الواجهة عند الفشل.
 * ===========================================================================
 */
import { supabase } from "@/lib/supabase";

// أنواع الأحداث الممكن تتبّعها عبر التطبيق (إكمال اختبار، بحث، مشاهدة منتج، إضافة للسلة... إلخ)
type EventType =
  | "quiz_completion"
  | "search_query"
  | "ai_search_query"
  | "product_view"
  | "wishlist_add"
  | "wishlist_remove"
  | "cart_add"
  | "cart_remove"
  | "chatbot_query"
  | "scent_dna_generated"
  | "purchase";

// معرّف المستخدم الحالي يُحفظ على مستوى الوحدة (module) لاستخدامه في كل حدث
let _currentUserId: string | null = null;

/**
 * تعيين المستخدم الحالي للتتبّع (يُستدعى عند تسجيل الدخول/الخروج).
 * @param userId معرّف المستخدم، أو null لإلغاء التتبّع عند تسجيل الخروج.
 */
export function setTrackingUser(userId: string | null): void {
  _currentUserId = userId;
}

/**
 * تسجيل حدث نشاط للمستخدم الحالي في جدول user_events.
 * لا يُسجَّل أي شيء إن لم يكن هناك مستخدم محدّد. العملية بصمت (fire-and-forget):
 * لا تُنتظر نتيجتها وتُكتفى بتسجيل تحذير في الكونسول عند الفشل دون التأثير على الواجهة.
 * @param eventType نوع الحدث.
 * @param eventData بيانات إضافية مرتبطة بالحدث (تُخزّن كـ JSON).
 */
export function trackEvent(
  eventType: EventType,
  eventData: Record<string, unknown>
): void {
  // تجاهل التتبّع للزوار غير المسجّلين
  if (!_currentUserId) return;

  supabase
    .from("user_events")
    .insert({
      user_id: _currentUserId,
      event_type: eventType,
      event_data: eventData,
    })
    .then(({ error }) => {
      if (error) console.warn("Tracking event failed:", error.message);
    });
}
