// plutu-callback — authoritative paid-marker for redirect gateways.
// Accepts Plutu's signed params via GET query (direct tlync callback) or POST
// JSON { rawQuery } (forwarded by OrderSuccessPage for localbankcards/mpgs,
// which only receive a browser return_url). Marks the order paid ONLY when the
// HMAC over the params verifies AND approved==1. verify_jwt must be disabled.
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";
import { approvedFlag, verifyCallbackHash } from "../_shared/plutu.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Extract the raw query string carrying the signed Plutu params.
  let rawQuery = "";
  if (req.method === "GET") {
    rawQuery = new URL(req.url).search.replace(/^\?/, "");
  } else if (req.method === "POST") {
    try {
      const body = await req.json();
      rawQuery = String(body.rawQuery ?? "").replace(/^\?/, "");
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
  } else {
    return json({ error: "Method not allowed" }, 405);
  }

  const params = new URLSearchParams(rawQuery);
  const gateway = params.get("gateway") ?? "";
  const orderId = params.get("invoice_no") ?? "";

  if (!gateway || !orderId) {
    return json({ error: "Missing gateway or invoice_no" }, 400);
  }

  const validHash = await verifyCallbackHash(gateway, rawQuery);
  if (!validHash) {
    console.warn("[plutu-callback] hash verification failed", { orderId, gateway });
    return json({ paid: false, error: "Hash verification failed" }, 400);
  }

  const supabase = getServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, total, payment_status")
    .eq("id", orderId)
    .single();

  if (!order) return json({ paid: false, error: "Order not found" }, 404);

  // Defense in depth: the signed amount must match the order total.
  const signedAmount = Number(params.get("amount"));
  const orderAmount = Number(order.total);
  const amountOk = Math.abs(signedAmount - orderAmount) < 0.005;

  if (approvedFlag(params) && amountOk) {
    if (order.payment_status !== "paid") {
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          payment_reference: params.get("transaction_id"),
          payment_gateway: gateway,
        })
        .eq("id", orderId);
    }
    return json({ paid: true, orderId, status: "paid" });
  }

  if (!amountOk) {
    console.warn("[plutu-callback] amount mismatch", {
      orderId,
      signedAmount,
      orderAmount,
    });
  }

  // Not approved (cancelled / declined). Leave unpaid; record the failure.
  if (order.payment_status === "unpaid") {
    await supabase
      .from("orders")
      .update({ payment_status: "failed", payment_gateway: gateway })
      .eq("id", orderId);
  }
  return json({ paid: false, orderId, status: "failed" });
});
