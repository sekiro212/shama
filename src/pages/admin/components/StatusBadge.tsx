/**
 * StatusBadge — مكوّن واجهة مشترك في لوحة الإدارة.
 *
 * يعرض شارة (badge) ملوّنة لقيمة حالة معيّنة. يتم اختيار نظام الألوان حسب
 * نوع المورد `type` (طلب، تقييم، ذكرى، كوبون، vanex)، بحيث يقوم نفس المكوّن
 * بتنسيق جميع الحالات عبر جداول لوحة الإدارة.
 */
import { Badge } from "@/components/ui/badge";
import { VANEX_STATUSES } from "@/lib/vanexStatus";

// أصناف ألوان Tailwind لكل حالة في دورة حياة شحنات Vanex.
// عدّة حالات مختلفة تتشارك نفس اللون عمدًا (مثلًا كل حالات "قيد النقل"
// بالأزرق، وكل حالات الفشل النهائي بالأحمر).
const VANEX_STATUS_STYLES: Record<(typeof VANEX_STATUSES)[number], string> = {
  store_new: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  accepted_by_store: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  shipped: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_warehouse: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  in_transit: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ship_received: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  ship_preperation: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ship_del_return: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ship_pending: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  delivered: "bg-green-500/20 text-green-400 border-green-500/30",
  complete: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  canceled: "bg-red-500/20 text-red-400 border-red-500/30",
  returned: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  store_return: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  recalled: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  unknown: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  type?: "order" | "review" | "memory" | "coupon" | "vanex";
}

/**
 * تُرجع أصناف ألوان Tailwind المناسبة للحالة، بالاعتماد على نوع المورد
 * `type`. وعند عدم التعرّف على الحالة تعود إلى لون رمادي محايد.
 */
function getStatusStyle(status: string, type?: string): string {
  // توحيد حالة الأحرف ليكون البحث في خرائط الأنماط غير حسّاس لحالة الأحرف.
  const key = status.toLowerCase();

  if (type === "coupon") {
    const couponStyles: Record<string, string> = {
      active: "bg-green-500/20 text-green-400 border-green-500/30",
      inactive: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      expired: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    if (couponStyles[key]) return couponStyles[key];
  }

  if (type === "review" || type === "memory") {
    const moderationStyles: Record<string, string> = {
      pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      approved: "bg-green-500/20 text-green-400 border-green-500/30",
    };
    if (moderationStyles[key]) return moderationStyles[key];
  }

  if (type === "vanex") {
    // البحث عن حالة الشحنة في الخريطة؛ الرموز غير المعروفة تعود إلى الرمادي.
    return (
      VANEX_STATUS_STYLES[key as keyof typeof VANEX_STATUS_STYLES] ??
      "bg-gray-500/20 text-gray-400 border-gray-500/30"
    );
  }

  // الفرع الافتراضي: حالات الطلبات (وتُستخدم أيضًا لطلبات الهدايا).
  const orderStyles: Record<string, string> = {
    pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    processing: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    shipped: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    delivered: "bg-green-500/20 text-green-400 border-green-500/30",
    accepted: "bg-[#5B8DD9]/20 text-[#5B8DD9] border-[#5B8DD9]/30",
    returned: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  if (orderStyles[key]) return orderStyles[key];

  return "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

/**
 * يعرض شارة محدّدة الإطار وملوّنة لقيمة حالة.
 *
 * @param status - نص الحالة الخام (يُستخدم للون وكنص افتراضي).
 * @param label  - نص عرض اختياري يحل محل نص الحالة الخام.
 * @param type   - عائلة المورد التي تحدّد نظام الألوان.
 */
export function StatusBadge({ status, label, type }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      // تسميات Vanex منسّقة مسبقًا للقراءة، لذا نتجاوز تحويل capitalize هنا.
      className={`${type === "vanex" ? "" : "capitalize"} ${getStatusStyle(status, type)}`}
    >
      {label ?? status}
    </Badge>
  );
}
