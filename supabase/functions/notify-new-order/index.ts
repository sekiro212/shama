// notify-new-order — pushes a Telegram alert the moment an order lands.
//
// Called by the `orders_notify_telegram` database trigger (see
// supabase/migrations/20260718_order_telegram_notify.sql) via pg_net, so it
// fires for EVERY insert path: the checkout page, the Plutu payment flow, the
// admin panel, or a direct SQL insert. Nothing client-side can skip it.
//
// Two events:
//   new_order     — a row was inserted (any status, paid or unpaid)
//   status_change — orders.status changed (confirmed, shipped, returned, …)
//
// Required edge function secrets:
//   TELEGRAM_BOT_TOKEN — same bot as telegram-bot/, from @BotFather
//   ADMIN_CHAT_IDS     — comma-separated numeric chat ids to notify
// Optional:
//   ADMIN_ORDER_URL    — base URL for the admin order view; when set, each
//                        alert carries a "View order" button appended with the
//                        order id.
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// The orders table has drifted from supabase_schema.sql, so the trigger hands
// us the whole row as JSON and we read every field defensively. A column that
// does not exist simply renders as "—" instead of breaking the alert.
type Row = Record<string, unknown>;

const str = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "" : String(v);

const money = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(2)} LYD` : "—";
};

// Telegram HTML parse mode: only these three need escaping.
const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  accepted: "مقبول",
  returned: "مُرتجع",
};

const PAYMENT_AR: Record<string, string> = {
  cod: "الدفع عند الاستلام",
  bank_transfer: "حوالة مصرفية",
  tlync: "بطاقة (Tlync)",
  localbankcards: "بطاقة محلية",
  mpgs: "بطاقة (MPGS)",
  sadad: "سداد",
  adfali: "أدفعلي",
};

const label = (map: Record<string, string>, key: string): string =>
  key ? (map[key] ?? key) : "—";

/** Renders the JSONB items array into readable lines, whatever its shape. */
function formatItems(raw: unknown): string {
  if (!Array.isArray(raw) || raw.length === 0) return "—";

  const lines = raw.slice(0, 15).map((entry) => {
    const it = (entry ?? {}) as Row;
    const name =
      str(it.name_ar) || str(it.name) || str(it.perfume_name) || "منتج";
    const qty = Number(it.quantity ?? it.qty ?? 1) || 1;
    const size = str(it.size) || str(it.bottle_size);
    const sizePart = size ? ` — ${size}` : "";
    return `  • ${esc(name)}${esc(sizePart)} × ${qty}`;
  });

  if (raw.length > 15) lines.push(`  • …+${raw.length - 15} أخرى`);
  return lines.join("\n");
}

function buildMessage(
  event: string,
  order: Row,
  oldStatus: string,
): string {
  const id = str(order.id);
  const shortId = id ? id.slice(0, 8) : "—";
  const name = `${str(order.first_name)} ${str(order.last_name)}`.trim();
  const status = str(order.status);

  const header = event === "status_change"
    ? `🔄 <b>تغيّرت حالة الطلب</b>\n<code>${esc(shortId)}</code>\n\n` +
      `<b>من:</b> ${esc(label(STATUS_AR, oldStatus))}\n` +
      `<b>إلى:</b> ${esc(label(STATUS_AR, status))}`
    : `🛒 <b>طلب جديد</b>\n<code>${esc(shortId)}</code>\n\n` +
      `<b>الحالة:</b> ${esc(label(STATUS_AR, status))}`;

  return [
    header,
    ``,
    `<b>الزبون:</b> ${esc(name || "—")}`,
    `<b>الهاتف:</b> ${esc(str(order.phone) || "—")}`,
    `<b>المدينة:</b> ${esc(str(order.city) || "—")}` +
      (str(order.place_name) ? ` — ${esc(str(order.place_name))}` : ""),
    ``,
    `<b>الأصناف:</b>`,
    formatItems(order.items),
    ``,
    `<b>الدفع:</b> ${esc(label(PAYMENT_AR, str(order.payment_method)))}`,
    `<b>الإجمالي:</b> ${esc(money(order.total))}`,
  ].join("\n");
}

async function sendToChat(
  token: string,
  chatId: string,
  text: string,
  orderId: string,
): Promise<{ chatId: string; ok: boolean; error?: string }> {
  const adminUrl = Deno.env.get("ADMIN_ORDER_URL");
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  if (adminUrl && orderId) {
    body.reply_markup = {
      inline_keyboard: [[
        { text: "🔎 فتح الطلب", url: `${adminUrl}${orderId}` },
      ]],
    };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      return { chatId, ok: false, error: `${res.status}: ${await res.text()}` };
    }
    return { chatId, ok: true };
  } catch (e) {
    return { chatId, ok: false, error: String(e) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatIds = (Deno.env.get("ADMIN_CHAT_IDS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!token || chatIds.length === 0) {
    // Misconfiguration must be loud in the logs but must never look like a
    // transient failure the trigger should retry.
    console.error("Missing TELEGRAM_BOT_TOKEN or ADMIN_CHAT_IDS");
    return json({ error: "Notifier not configured" }, 500);
  }

  let payload: Row;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const order = (payload.order ?? {}) as Row;
  if (!order || typeof order !== "object" || !str(order.id)) {
    return json({ error: "Missing order payload" }, 400);
  }

  const event = str(payload.event) || "new_order";
  const text = buildMessage(event, order, str(payload.old_status));

  const results = await Promise.all(
    chatIds.map((id) => sendToChat(token, id, text, str(order.id))),
  );

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error("Telegram delivery failures", JSON.stringify(failed));
  }

  return json({
    event,
    order_id: str(order.id),
    delivered: results.length - failed.length,
    failed: failed.length,
  });
});
