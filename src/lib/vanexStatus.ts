/**
 * =============================================================================
 * تعريف حالات شركة التوصيل Vanex وقواعد التحكم بها
 * -----------------------------------------------------------------------------
 * يوفّر هذا الملف القائمة الكاملة لحالات الشحنة الواردة من واجهة Vanex،
 * بالإضافة إلى مجموعات تصنيفية تحدد متى يُسمح بإلغاء الشحنة أو استرجاعها.
 * تُستخدم هذه القيم في لوحة الإدارة للتحكم بأزرار الإجراءات على الطلبات.
 * =============================================================================
 */

/** القائمة الكاملة لكل حالات الشحنة الممكنة كما تردنا من نظام Vanex. */
export const VANEX_STATUSES = [
  "store_new",
  "accepted_by_store",
  "pending",
  "shipped",
  "in_warehouse",
  "in_transit",
  "ship_received",
  "ship_preperation",
  "ship_del_return",
  "ship_pending",
  "delivered",
  "complete",
  "cancelled",
  "canceled",
  "returned",
  "store_return",
  "recalled",
  "unknown",
] as const;

/** نوع نصي محصور بقيم VANEX_STATUSES فقط لضمان سلامة الأنواع. */
export type VanexStatus = (typeof VANEX_STATUSES)[number];

// الحالات المبكرة التي ما زالت الشحنة فيها قابلة للإلغاء (لم تُشحن بعد).
export const CANCELLABLE_VANEX_STATUSES = new Set<string>([
  "store_new",
  "pending",
  "accepted_by_store",
]);

// الحالات النهائية التي انتهت عندها رحلة الشحنة (لا يمكن التراجع عنها).
export const TERMINAL_VANEX_STATUSES = new Set<string>([
  "delivered",
  "complete",
  "cancelled",
  "canceled",
  "returned",
  "store_return",
  "recalled",
]);

/**
 * تتحقق مما إذا كان يمكن إلغاء الشحنة بناءً على حالتها الحالية.
 * يُسمح بالإلغاء فقط إذا كانت الحالة ضمن الحالات المبكرة القابلة للإلغاء.
 */
export function canCancelVanex(status: string | null | undefined): boolean {
  return status != null && CANCELLABLE_VANEX_STATUSES.has(status);
}

/**
 * تتحقق مما إذا كان يمكن استرجاع الشحنة (recall).
 * يُسمح بالاسترجاع إذا كانت الشحنة قد تجاوزت مرحلة الإلغاء المبكر
 * ولم تصل بعد إلى حالة نهائية، أي أنها في منتصف رحلة الشحن.
 */
export function canRecallVanex(status: string | null | undefined): boolean {
  return (
    status != null &&
    !CANCELLABLE_VANEX_STATUSES.has(status) &&
    !TERMINAL_VANEX_STATUSES.has(status)
  );
}
