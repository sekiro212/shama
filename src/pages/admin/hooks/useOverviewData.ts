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

export function useOverviewData(orders: Order[], orderStats: OrderStats) {
  const dailyRevenue = useMemo((): DailyRevenue[] => {
    const now = new Date();
    const dateMap = new Map<string, { revenue: number; orders: number }>();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dateMap.set(key, { revenue: 0, orders: 0 });
    }

    orders.forEach((order) => {
      const key = new Date(order.order_date).toISOString().slice(0, 10);
      if (dateMap.has(key)) {
        const entry = dateMap.get(key)!;
        entry.revenue += order.total;
        entry.orders += 1;
      }
    });

    return Array.from(dateMap.entries()).map(([dateStr, data]) => {
      const d = new Date(dateStr);
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: Math.round(data.revenue * 100) / 100,
        orders: data.orders,
      };
    });
  }, [orders]);

  const statusDistribution = useMemo((): StatusDistribution[] => {
    const statusColors: Record<string, string> = {
      pending: "#6B7B8D",
      confirmed: "#5B8DD9",
      processing: "#F59E0B",
      shipped: "#3B82F6",
      delivered: "#22C55E",
      accepted: "#5B8DD9",
      returned: "#EAB308",
    };

    const counts = new Map<string, number>();
    orders.forEach((order) => {
      counts.set(order.status, (counts.get(order.status) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        fill: statusColors[status] || "#6B7B8D",
      }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  const topProducts = useMemo((): TopProduct[] => {
    const productCounts = new Map<string, number>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const name = item.name || "Unknown";
        productCounts.set(name, (productCounts.get(name) || 0) + item.quantity);
      });
    });

    return Array.from(productCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders]);

  return { dailyRevenue, statusDistribution, topProducts };
}
