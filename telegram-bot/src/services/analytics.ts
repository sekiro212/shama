import { supabase } from "./supabase";
import type { OrderItem } from "../types";

// ─── Analytics result shape ───────────────────

export interface AnalyticsData {
  totalRevenue: number;
  orderCount: number;
  ordersByStatus: Record<string, number>;
  topProducts: Array<{ name: string; orderCount: number }>;
  lowStockItems: Array<{ id: string; name: string; stock: number }>;
  pendingOrderCount: number;
  avgOrderValue: number;
}

// ─── Get analytics ────────────────────────────

export async function getAnalytics(): Promise<AnalyticsData> {
  // Fetch orders from the last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [ordersResult, lowStockResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, total, items")
      .gte("created_at", since),
    supabase
      .from("perfumes")
      .select("id, name, stock_quantity")
      .lt("stock_quantity", 5),
  ]);

  if (ordersResult.error) {
    throw new Error(`Failed to fetch orders for analytics: ${ordersResult.error.message}`);
  }
  if (lowStockResult.error) {
    throw new Error(`Failed to fetch low-stock products: ${lowStockResult.error.message}`);
  }

  const orders = ordersResult.data || [];
  const lowStockRows = lowStockResult.data || [];

  // Revenue and count
  const orderCount = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

  // Group by status
  const ordersByStatus: Record<string, number> = {};
  for (const order of orders) {
    const s = order.status || "unknown";
    ordersByStatus[s] = (ordersByStatus[s] ?? 0) + 1;
  }

  // Pending count
  const pendingOrderCount = ordersByStatus["pending"] ?? 0;

  // Top products by appearance in items
  const productCounter: Record<string, number> = {};
  for (const order of orders) {
    const items = (order.items as OrderItem[]) || [];
    for (const item of items) {
      const key = item.name || item.id;
      productCounter[key] = (productCounter[key] ?? 0) + (item.quantity ?? 1);
    }
  }

  const topProducts = Object.entries(productCounter)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, orderCount: count }));

  // Low-stock items
  const lowStockItems = lowStockRows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    stock: row.stock_quantity as number,
  }));

  return {
    totalRevenue,
    orderCount,
    ordersByStatus,
    topProducts,
    lowStockItems,
    pendingOrderCount,
    avgOrderValue,
  };
}
