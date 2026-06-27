/**
 * useOverviewData.ts
 *
 * hook للبيانات المشتقّة الخاص بلوحة معلومات "النظرة العامة" في الإدارة.
 * يأخذ الطلبات + الإحصاءات المُحمَّلة مسبقًا ويحسب مجموعات بيانات الرسوم البيانية الثلاث
 * (الإيرادات اليومية، توزيع حالات الطلبات، أبرز المنتجات) في الذاكرة بالكامل —
 * فهو لا ينفّذ أي استعلامات Supabase خاصة به. تُحفظ كل نتيجة في الذاكرة (memoized) كي
 * لا تُعاد حساب الرسوم البيانية إلا عند تغيّر مصفوفة الطلبات.
 */
import { useMemo } from "react";
import type { Order, OrderStats } from "@/services/ordersService";

interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  fill: string;
}

interface TopProduct {
  name: string;
  count: number;
}

/**
 * hook يحسب مجموعات بيانات رسوم لوحة المعلومات من الطلبات.
 * @param orders     الطلبات المُحمَّلة (المصدر لكل عمليات التجميع).
 * @param orderStats إحصاءات الطلبات المحسوبة مسبقًا (مُبقاة في التوقيع من أجل
 *                   لوحة المعلومات؛ أما عمليات التجميع هنا فتُشتَقّ من `orders`).
 * @returns `dailyRevenue` (آخر 30 يومًا)، و`statusDistribution` (الأعداد لكل
 *          حالة)، و`topProducts` (أعلى 5 منتجات حسب الكمية المباعة).
 */
export function useOverviewData(orders: Order[], orderStats: OrderStats) {
  // بناء سلسلة إيرادات/طلبات لآخر 30 يومًا.
  const dailyRevenue = useMemo((): DailyRevenue[] => {
    const now = new Date();
    const dateMap = new Map<string, { revenue: number; orders: number }>();

    // تهيئة الخريطة بآخر 30 يومًا تقويميًا (بمفتاح YYYY-MM-DD) بقيمة صفر،
    // كي تظهر الأيام التي بلا طلبات على الرسم البياني أيضًا.
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dateMap.set(key, { revenue: 0, orders: 0 });
    }

    // توزيع كل طلب على يومه، مع تجميع الإيرادات وعدد الطلبات.
    orders.forEach((order) => {
      const key = new Date(order.order_date).toISOString().slice(0, 10);
      if (dateMap.has(key)) {
        const entry = dateMap.get(key)!;
        entry.revenue += order.total;
        entry.orders += 1;
      }
    });

    // التحويل إلى صفوف ملائمة للرسم البياني مع تسمية تاريخ قصيرة مقروءة.
    return Array.from(dateMap.entries()).map(([dateStr, data]) => {
      const d = new Date(dateStr);
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: Math.round(data.revenue * 100) / 100,
        orders: data.orders,
      };
    });
  }, [orders]);

  // عدّ الطلبات لكل حالة وإرفاق لون رسم بياني لكل شريحة.
  const statusDistribution = useMemo((): StatusDistribution[] => {
    // لون ثابت لكل حالة طلب من أجل الرسم البياني الدائري/الشريطي.
    const statusColors: Record<string, string> = {
      pending: "#6B7B8D",
      confirmed: "#5B8DD9",
      processing: "#F59E0B",
      shipped: "#3B82F6",
      delivered: "#22C55E",
      accepted: "#5B8DD9",
      returned: "#EAB308",
    };

    // إحصاء عدد الطلبات التي تندرج تحت كل حالة.
    const counts = new Map<string, number>();
    orders.forEach((order) => {
      counts.set(order.status, (counts.get(order.status) || 0) + 1);
    });

    // جعل أول حرف من التسمية كبيرًا، وتطبيق اللون، والترتيب بالشريحة الأكبر أولًا.
    return Array.from(counts.entries())
      .map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        fill: statusColors[status] || "#6B7B8D",
      }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  // تحديد المنتجات الأكثر مبيعًا حسب إجمالي الكمية عبر جميع الطلبات.
  const topProducts = useMemo((): TopProduct[] => {
    // جمع الكميات لكل اسم منتج (تُقرأ من عناصر JSONB في كل طلب).
    const productCounts = new Map<string, number>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const name = item.name || "Unknown";
        productCounts.set(name, (productCounts.get(name) || 0) + item.quantity);
      });
    });

    // الترتيب حسب الكمية تنازليًا والإبقاء على أعلى 5 فقط.
    return Array.from(productCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders]);

  return { dailyRevenue, statusDistribution, topProducts };
}
