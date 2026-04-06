import { supabase } from "./supabase";
import { GetOrdersSchema } from "../types";
import type { BotLanguage, OrderItem } from "../types";
import { UUID_RE, SHORT_ID_RE } from "../utils/ids";

// Re-exported under FULL_UUID_RE for callers that already use that name.
export const FULL_UUID_RE = UUID_RE;
export { SHORT_ID_RE };

// Sentinel error messages thrown by getOrderById and mapped to user-friendly
// text in the tool executor. Using Error.message as a sentinel keeps the
// function signature simple and matches the project's existing error idiom.
export const ORDER_NOT_FOUND = "ORDER_NOT_FOUND";
export const ORDER_AMBIGUOUS = "ORDER_AMBIGUOUS";
export const ORDER_INVALID_ID = "ORDER_INVALID_ID";

const ORDER_COLUMNS =
  "id, first_name, last_name, phone, city, place_name, status, items, total, created_at";

// Max recent orders scanned by the short-prefix path of getOrderById. For an
// admin bot on a single store this is trivially cheap and collision risk for
// an 8-char hex prefix across this many rows is negligible.
const SHORT_ID_SCAN_LIMIT = 500;

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
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false });

  if (timeRange !== "all") {
    const msMap: Record<string, number> = {
      today: 24 * 60 * 60 * 1000,
      week:  7  * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    const since = new Date(Date.now() - msMap[timeRange]).toISOString();
    query = query.gte("created_at", since);
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
  return (data as Order[]) || [];
}

// ─── Get one order by full UUID or short hex prefix ───
//
// Postgres UUID columns refuse ILIKE and PostgREST cannot cast a column to
// text inside a filter clause, so the short-prefix path fetches recent rows
// and filters in JS. Future upgrade: replace with a Postgres RPC
// `get_order_by_short_id(p text)` doing `WHERE id::text ILIKE p || '%'`.
export async function getOrderById(idOrShortId: string): Promise<Order> {
  const cleaned = (idOrShortId ?? "").trim();
  if (!cleaned) throw new Error(ORDER_INVALID_ID);

  if (FULL_UUID_RE.test(cleaned)) {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("id", cleaned)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch order: ${error.message}`);
    if (!data) throw new Error(ORDER_NOT_FOUND);
    return data as unknown as Order;
  }

  if (SHORT_ID_RE.test(cleaned)) {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(SHORT_ID_SCAN_LIMIT);

    if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
    const rows = (data as unknown as Order[] | null) ?? [];

    const prefix = cleaned.toLowerCase();
    const matches = rows.filter((o) => o.id.toLowerCase().startsWith(prefix));

    if (matches.length === 0) throw new Error(ORDER_NOT_FOUND);
    if (matches.length > 1) throw new Error(ORDER_AMBIGUOUS);
    return matches[0];
  }

  throw new Error(ORDER_INVALID_ID);
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
