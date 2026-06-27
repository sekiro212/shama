// plutu-payment — browser-invoked Plutu payment orchestrator.
// Amount is ALWAYS read from the order row (server-side); invoice_no = order id.
// Marks an order paid only after a successful Plutu confirm (OTP gateways).
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase-client.ts";
import {
  callPlutu,
  CARD_GATEWAYS,
  OTP_GATEWAYS,
  type PlutuGateway,
} from "../_shared/plutu.ts";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://shama.ly";
const FUNCTIONS_BASE_URL =
  Deno.env.get("FUNCTIONS_BASE_URL") ??
  `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1`;

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

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = String(payload.action ?? "");
  const orderId = String(payload.orderId ?? "");
  const gateway = String(payload.gateway ?? "") as PlutuGateway;

  if (!orderId) return json({ error: "Missing orderId" }, 400);

  const supabase = getServiceClient();
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, total, payment_status")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) return json({ error: "Order not found" }, 404);
  if (order.payment_status === "paid") {
    return json({ error: "Order already paid" }, 409);
  }

  // amount string with max 2 decimals, taken from the DB — never the client.
  const amount = Number(order.total).toFixed(2);

  try {
    if (action === "otp_verify") {
      if (!OTP_GATEWAYS.includes(gateway)) {
        return json({ error: "Gateway is not OTP-based" }, 400);
      }
      const mobile = String(payload.mobile_number ?? "");
      const params: Record<string, string | number> = {
        mobile_number: mobile,
        amount,
      };
      if (gateway === "sadadapi") {
        params.birth_year = String(payload.birth_year ?? "");
      }
      const r = await callPlutu(gateway, "verify", params);
      if (!r.ok || !r.result?.process_id) {
        return json(
          { error: r.message ?? "Verification failed", status: r.status },
          400,
        );
      }
      return json({ process_id: String(r.result.process_id) });
    }

    if (action === "otp_confirm") {
      if (!OTP_GATEWAYS.includes(gateway)) {
        return json({ error: "Gateway is not OTP-based" }, 400);
      }
      const process_id = String(payload.process_id ?? "");
      const code = String(payload.code ?? "");
      if (!process_id || !code) {
        return json({ error: "Missing process_id or code" }, 400);
      }
      const r = await callPlutu(gateway, "confirm", {
        process_id,
        code,
        amount,
        invoice_no: orderId,
      });
      if (!r.ok || !r.result?.transaction_id) {
        return json(
          { error: r.message ?? "Confirmation failed", status: r.status },
          400,
        );
      }
      const transactionId = String(r.result.transaction_id);
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          payment_reference: transactionId,
          payment_gateway: gateway,
        })
        .eq("id", orderId);
      return json({ paid: true, transaction_id: transactionId });
    }

    if (action === "card_initiate") {
      if (!CARD_GATEWAYS.includes(gateway)) {
        return json({ error: "Gateway is not card/redirect-based" }, 400);
      }
      const lang = payload.lang === "ar" ? "ar" : "en";
      const params: Record<string, string | number> = {
        amount,
        invoice_no: orderId,
        return_url: `${SITE_URL}/order-success/${orderId}`,
        lang,
      };
      if (gateway === "tlync") {
        params.mobile_number = String(payload.mobile_number ?? "");
        params.callback_url = `${FUNCTIONS_BASE_URL}/plutu-callback`;
      }
      const r = await callPlutu(gateway, "confirm", params);
      const redirectUrl = r.result?.redirect_url ?? r.result?.redirect;
      if (!r.ok || !redirectUrl) {
        return json(
          { error: r.message ?? "Could not start payment", status: r.status },
          400,
        );
      }
      // Stamp the chosen gateway so the order reflects the attempt.
      await supabase
        .from("orders")
        .update({ payment_gateway: gateway })
        .eq("id", orderId);
      return json({ redirect_url: String(redirectUrl) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[plutu-payment] error", err);
    return json({ error: "Internal error" }, 500);
  }
});
