import { supabase } from "./supabase";
import { GetOrdersSchema } from "../types";
import type { BotLanguage, OrderItem } from "../types";

// ─── Order type ───────────────────────────────

export interface Order {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  place_name: string | null;
  status: string;
  items: OrderItem[];
  total: number;
  created_at: string;
}

// ─── Fetch orders ─────────────────────────────

export async function fetchOrders(options?: {
  timeRange?: "today" | "week" | "month" | "all";
  status?: string;
}): Promise<Order[]> {
  const parsed = GetOrdersSchema.safeParse(options ?? {});
  const { time_range: timeRange, status } = parsed.success
    ? parsed.data
    : { time_range: "today" as const, status: "all" as const };

  let query = supabase
    .from("orders")
    .select("id, first_name, last_name, phone, city, place_name, status, items, total, created_at")
    .order("created_at", { ascending: false });

  // Apply time range filter
  if (timeRange !== "all") {
    const msMap: Record<string, number> = {
      today: 24 * 60 * 60 * 1000,
      week:  7  * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    const since = new Date(Date.now() - msMap[timeRange]).toISOString();
    query = query.gte("created_at", since);
  }

  // Apply status filter
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
  return (data as Order[]) || [];
}

// ─── Format a single order ────────────────────

export function formatOrder(order: Order, lang: BotLanguage): string {
  const isAr = lang === "ar";
  const items = (order.items as OrderItem[]) || [];
  const itemLines = items
    .map((i) => `  • ${i.name} (${i.size}) ×${i.quantity} — ${i.price} LYD`)
    .join("\n");

  const date = new Date(order.created_at).toLocaleString(isAr ? "ar-LY" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return [
    `<b>${isAr ? "طلب" : "Order"} #${order.id.slice(0, 8)}</b>`,
    `${isAr ? "العميل" : "Customer"}: ${order.first_name} ${order.last_name}`,
    `${isAr ? "الهاتف" : "Phone"}: ${order.phone}`,
    `${isAr ? "المدينة" : "City"}: ${order.city}${order.place_name ? ` - ${order.place_name}` : ""}`,
    `${isAr ? "الحالة" : "Status"}: ${order.status}`,
    `${isAr ? "التاريخ" : "Date"}: ${date}`,
    `${isAr ? "المنتجات" : "Items"}:`,
    itemLines,
    `<b>${isAr ? "الإجمالي" : "Total"}: ${order.total} LYD</b>`,
  ].join("\n");
}
