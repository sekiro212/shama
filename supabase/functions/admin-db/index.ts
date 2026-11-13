// admin-db — the admin panel's write path.
//
// Why this exists: the admin panel wrote to the database straight from the
// browser with the anon key. That only worked because those tables accepted
// writes from anyone, which is precisely the hole that had to be closed — a
// visitor could rewrite prices, mint discount codes or approve their own
// reviews. Policies named "Admin update reviews" were `USING (true)`, because
// admin identity is a custom users table, not Supabase Auth, so there was no
// auth.uid() to check and `true` was left in its place.
//
// Writes now arrive here, are authorised against a signed admin token issued by
// admin-auth, and run with the service role. The tables can then refuse the
// browser entirely.
//
// This is a narrow gateway, not a generic SQL endpoint: only the table/action
// pairs the panel actually uses are permitted, and filters may only be equality
// or IN on a named column. Anything else is rejected rather than passed through.
//
// Deploy:  supabase functions deploy admin-db
// Secrets: ADMIN_TOKEN_SECRET (shared with admin-auth), plus the platform's
//          SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";
import { verifyAdminToken } from "../_shared/admin-token.ts";

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

// Exactly what the admin panel does today — nothing speculative. Adding a
// capability here is a deliberate act, which is the point.
const ALLOWED: Record<string, ReadonlyArray<string>> = {
  perfumes: ["insert", "update", "delete"],
  perfume_images: ["insert", "update", "delete"],
  perfume_samples: ["insert", "update", "delete"],
  perfume_bottle_sizes: ["insert", "update", "delete"],
  orders: ["update", "delete"],
  promo_codes: ["insert", "update", "delete"],
  reviews: ["update", "delete"],
  memories: ["insert", "update", "delete"],
  influencers: ["insert", "update", "delete"],
  influencer_payouts: ["insert", "update", "delete"],
  custom_gift_orders: ["update", "delete"],
};

// Filter columns the panel actually targets. An open column list would let a
// caller filter on anything, which matters for UPDATE and DELETE.
const FILTER_COLUMNS = new Set([
  "id", "perfume_id", "order_id", "influencer_id", "user_id", "code", "status",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const adminId = await verifyAdminToken(payload.adminToken);
  if (!adminId) return json({ error: "Admin authorisation required" }, 403);

  const table = String(payload.table ?? "");
  const action = String(payload.action ?? "");
  if (!ALLOWED[table]?.includes(action)) {
    return json({ error: `Not permitted: ${action} on ${table}` }, 400);
  }

  // Equality/IN filters only, on a known column.
  const filters = (payload.filters ?? {}) as Record<string, unknown>;
  for (const col of Object.keys(filters)) {
    if (!FILTER_COLUMNS.has(col)) {
      return json({ error: `Cannot filter on ${col}` }, 400);
    }
  }

  // An UPDATE or DELETE with no filter rewrites or empties the whole table.
  // Refuse rather than trust the caller to always pass one.
  if ((action === "update" || action === "delete") && Object.keys(filters).length === 0) {
    return json({ error: `${action} requires a filter` }, 400);
  }

  const supabase = getServiceClient();
  let q = supabase.from(table) as ReturnType<typeof supabase.from>;

  try {
    if (action === "insert") {
      q = q.insert(payload.values as never);
    } else if (action === "update") {
      q = q.update(payload.values as never);
    } else {
      q = q.delete();
    }

    for (const [col, val] of Object.entries(filters)) {
      q = Array.isArray(val) ? q.in(col, val) : q.eq(col, val);
    }

    // The panel needs inserted ids back; callers that do not can ignore it.
    const { data, error } = await q.select();
    if (error) {
      console.error("admin-db:", table, action, error.message);
      return json({ error: error.message }, 400);
    }
    return json({ data });
  } catch (e) {
    console.error("admin-db: unexpected", table, action, e);
    return json({ error: "Request failed" }, 500);
  }
});
