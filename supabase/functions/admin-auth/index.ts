// admin-auth — server-side admin credential check.
//
// Why this exists: authenticateAdmin() in src/services/authService.ts matched
// username + password straight from the browser with
//   supabase.from("users").select("*").eq("username",…).eq("password",…)
// That requires the browser to be able to read the users table, and the anon
// key is published in the site bundle — so anyone could read every admin row,
// password column included, in plain text.
//
// The check now runs here with the service-role key, and the users table can be
// closed to anon entirely. The browser sends credentials and gets back only a
// sanitised user object; the password never leaves the database.
//
// Deploy:  supabase functions deploy admin-auth
// Needs:   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (set by the platform)
//
// NOTE: passwords in this table are still stored in plain text. Moving the
// check server-side stops the public leak but is not a substitute for hashing
// them — see the migration notes.
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";
import { issueAdminToken } from "../_shared/admin-token.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: { username?: unknown; password?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const username = typeof payload.username === "string" ? payload.username.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  // Same generic message for missing, unknown, and wrong-password cases, so the
  // response never reveals which usernames exist.
  const INVALID = { success: false, error: "Invalid username or password" };
  if (!username || !password) return json(INVALID, 401);

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, is_active, created_at, updated_at, password")
    .eq("username", username)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("admin-auth: lookup failed", error.message);
    return json({ success: false, error: "Authentication failed" }, 500);
  }
  if (!data) return json(INVALID, 401);

  // Constant-time compare so response timing does not leak the password prefix.
  const enc = new TextEncoder();
  const a = enc.encode(data.password ?? "");
  const b = enc.encode(password);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  if (diff !== 0) return json(INVALID, 401);

  // Never return the password column to the client.
  const { password: _omit, ...user } = data;

  // Signed proof of this check, for functions that perform admin-only actions
  // (vanex-proxy). A localStorage flag cannot authorise anything server-side.
  const token = await issueAdminToken(data.id);

  return json({ success: true, user, token });
});
