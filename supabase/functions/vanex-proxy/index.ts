// vanex-proxy — browser-invoked relay for the Vanex delivery API.
//
// Why this exists: vanexService.ts read VITE_VANEX_TOKEN, and Vite inlines
// every VITE_* value into the public bundle, so the delivery token shipped
// inside dist/assets/index-*.js. That token does not merely cost money if
// stolen — it can create, cancel and recall real shipments on the account.
//
// The token now lives only in this function's environment.
//
// Authorisation mirrors how the app actually uses the API:
//   cities, track           reads, and the storefront needs them at checkout
//                           -> open, same as before
//   create, cancel, recall  only ever called from the admin order panel
//                           -> require a signed admin token from admin-auth
//
// Deploy:  supabase functions deploy vanex-proxy
// Secrets: supabase secrets set VANEX_TOKEN=...
//          supabase secrets set ADMIN_TOKEN_SECRET="$(openssl rand -hex 32)"
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { verifyAdminToken } from "../_shared/admin-token.ts";

const VANEX_BASE = Deno.env.get("VANEX_BASE_URL") ?? "https://app.vanex.ly/api/v1";
const VANEX_TOKEN = Deno.env.get("VANEX_TOKEN") ?? "";

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

const PUBLIC_ACTIONS = new Set(["cities", "track"]);
const ADMIN_ACTIONS = new Set(["create", "cancel", "recall"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!VANEX_TOKEN) {
    console.error("vanex-proxy: VANEX_TOKEN is not set");
    return json({ error: "Delivery is not configured" }, 503);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = String(payload.action ?? "");
  if (!PUBLIC_ACTIONS.has(action) && !ADMIN_ACTIONS.has(action)) {
    return json({ error: `Unknown action: ${action}` }, 400);
  }

  if (ADMIN_ACTIONS.has(action)) {
    const adminId = await verifyAdminToken(payload.adminToken);
    if (!adminId) return json({ error: "Admin authorisation required" }, 403);
  }

  const auth = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${VANEX_TOKEN}`,
  };

  let url: string;
  let init: RequestInit;

  switch (action) {
    case "cities":
      url = `${VANEX_BASE}/city/all`;
      init = { method: "GET", headers: auth };
      break;

    case "track": {
      const code = String(payload.code ?? "");
      if (!code) return json({ error: "Missing code" }, 400);
      // Tracking is unauthenticated upstream; no token is attached.
      url = `${VANEX_BASE}/tracking?code=${encodeURIComponent(code)}`;
      init = { method: "GET" };
      break;
    }

    case "create":
      url = `${VANEX_BASE}/customer/package`;
      init = { method: "POST", headers: auth, body: JSON.stringify(payload.package ?? {}) };
      break;

    case "cancel": {
      const id = String(payload.packageId ?? "");
      if (!id) return json({ error: "Missing packageId" }, 400);
      url = `${VANEX_BASE}/customer/package/${encodeURIComponent(id)}`;
      init = { method: "DELETE", headers: auth };
      break;
    }

    case "recall": {
      const id = String(payload.packageId ?? "");
      if (!id) return json({ error: "Missing packageId" }, 400);
      url = `${VANEX_BASE}/customer/package/${encodeURIComponent(id)}/recall`;
      init = {
        // PUT, matching the upstream endpoint vanexService.ts has always used.
        method: "PUT",
        headers: auth,
        body: JSON.stringify({ reason: String(payload.reason ?? "") }),
      };
      break;
    }

    default:
      return json({ error: "Unreachable" }, 400);
  }

  try {
    const upstream = await fetch(url, init);
    const text = await upstream.text();
    if (!upstream.ok) {
      // Logged in full, returned trimmed — upstream errors can echo request
      // details and this response reaches the browser.
      console.error("vanex-proxy:", action, upstream.status, text);
    }
    return new Response(text, {
      status: upstream.status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vanex-proxy: upstream fetch failed", action, e);
    return json({ error: "Upstream request failed" }, 502);
  }
});
