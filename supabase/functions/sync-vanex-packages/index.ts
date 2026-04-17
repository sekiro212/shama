import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";

const VANEX_BASE = Deno.env.get("VANEX_BASE_URL") ?? "https://app.vanex.ly/api/v1";
const BATCH_LIMIT = 50;
const CONCURRENCY = 5;
const TERMINAL_STATUSES = [
  "delivered",
  "cancelled",
  "canceled",
  "returned",
  "recalled",
  "store_return",
  "complete",
] as const;

interface VanexTrackingLogRaw {
  id: number;
  details?: string;
  type?: string;
  time?: string;
  user_name?: string;
}

interface VanexTrackingPackageRaw {
  id?: number;
  code?: string;
  status?: string;
  create_date?: string | null;
  delivery_date?: string | null;
  description?: string;
  qty?: number;
  city?: string | null;
  price?: number;
  payment_methode?: string;
}

interface VanexLogStored {
  id: number;
  status: string;
  description?: string;
  location?: string | null;
  created_at: string;
}

async function fetchTrackingPublic(
  code: string,
): Promise<{ pkg: VanexTrackingPackageRaw | null; logs: VanexTrackingLogRaw[] }> {
  try {
    const res = await fetch(`${VANEX_BASE}/tracking?code=${encodeURIComponent(code)}`);
    if (!res.ok) return { pkg: null, logs: [] };
    const json = await res.json();
    return {
      pkg: (json?.data?.package as VanexTrackingPackageRaw) ?? null,
      logs: (json?.data?.logs as VanexTrackingLogRaw[]) ?? [],
    };
  } catch {
    return { pkg: null, logs: [] };
  }
}

function mapLogs(raw: VanexTrackingLogRaw[]): VanexLogStored[] {
  return raw
    .filter((l) => l.id && l.time)
    .map((l) => ({
      id: l.id,
      status: l.type ?? "unknown",
      description: l.details,
      location: null,
      created_at: new Date((l.time ?? "").replace(" ", "T") + "Z").toISOString(),
    }));
}

interface OrderSyncRow {
  id: string;
  vanex_package_code: string;
  vanex_package_id: number | null;
  vanex_status: string | null;
  vanex_current_location: string | null;
  vanex_estimated_delivery: string | null;
  vanex_logs: VanexLogStored[] | null;
}

async function syncOne(
  supabase: ReturnType<typeof getServiceClient>,
  order: OrderSyncRow,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  const { pkg, logs: rawLogs } = await fetchTrackingPublic(order.vanex_package_code);

  if (!pkg || !pkg.status) {
    return { ok: false, error: "Vanex returned no status" };
  }

  const mappedLogs = mapLogs(rawLogs);
  const status = pkg.status;
  const currentLocation = pkg.city ?? null;
  const estimatedDelivery = pkg.delivery_date || null;

  const previousLogsLen = order.vanex_logs?.length ?? 0;
  const unchanged =
    status === order.vanex_status &&
    currentLocation === order.vanex_current_location &&
    estimatedDelivery === order.vanex_estimated_delivery &&
    mappedLogs.length === previousLogsLen;

  const patch: Record<string, unknown> = {
    vanex_last_synced_at: new Date().toISOString(),
  };
  if (!unchanged) {
    patch.vanex_status = status;
    patch.vanex_status_ar = null;
    patch.vanex_current_location = currentLocation;
    patch.vanex_estimated_delivery = estimatedDelivery;
    patch.vanex_logs = mappedLogs.length > 0 ? mappedLogs : null;
    if (pkg.id && !order.vanex_package_id) {
      patch.vanex_package_id = pkg.id;
    }
  }

  const { error } = await supabase.from("orders").update(patch).eq("id", order.id);
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, status };
}

serve(async (req) => {
  const supabase = getServiceClient();

  let orderId: string | null = null;
  try {
    if (req.method === "POST") {
      const text = await req.text();
      if (text.trim().length > 0) {
        const body = JSON.parse(text);
        if (body && typeof body.order_id === "string") {
          orderId = body.order_id;
        }
      }
    }
  } catch {
    // ignore body parse errors — run as a bulk sync
  }

  let query = supabase
    .from("orders")
    .select(
      "id, vanex_package_code, vanex_package_id, vanex_status, vanex_current_location, vanex_estimated_delivery, vanex_logs",
    )
    .not("vanex_package_code", "is", null);

  if (orderId) {
    query = query.eq("id", orderId);
  } else {
    query = query
      .or(
        `vanex_status.is.null,vanex_status.not.in.(${TERMINAL_STATUSES.join(",")})`,
      )
      .order("vanex_last_synced_at", { ascending: true, nullsFirst: true })
      .limit(BATCH_LIMIT);
  }

  const { data: orders, error: fetchError } = await query;

  if (fetchError) {
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const results = { synced: 0, skipped: 0, errors: [] as string[] };
  const eligible = (orders ?? []).filter((o) => o.vanex_package_code) as OrderSyncRow[];
  results.skipped = (orders?.length ?? 0) - eligible.length;

  for (let i = 0; i < eligible.length; i += CONCURRENCY) {
    const chunk = eligible.slice(i, i + CONCURRENCY);
    const outcomes = await Promise.all(chunk.map((o) => syncOne(supabase, o)));
    outcomes.forEach((r, idx) => {
      if (r.ok) results.synced += 1;
      else results.errors.push(`${chunk[idx].id}: ${r.error}`);
    });
  }

  return new Response(
    JSON.stringify({ success: true, ...results, total: orders?.length ?? 0 }),
    { headers: { "Content-Type": "application/json" } },
  );
});
