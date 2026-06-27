// Shared Plutu (https://plutu.ly) helpers for the edge functions.
// Verified against getplutu/plutu-php. Secrets come from env — never the client.

const BASE_URL =
  Deno.env.get("PLUTU_BASE_URL") ?? "https://api.plutus.ly/api/v1";
const API_KEY = Deno.env.get("PLUTU_API_KEY") ?? "";
const ACCESS_TOKEN = Deno.env.get("PLUTU_ACCESS_TOKEN") ?? "";
const SECRET_KEY = Deno.env.get("PLUTU_SECRET_KEY") ?? "";

export type PlutuGateway =
  | "edfali"
  | "sadadapi"
  | "localbankcards"
  | "tlync"
  | "mpgs";

export const OTP_GATEWAYS: PlutuGateway[] = ["edfali", "sadadapi"];
export const CARD_GATEWAYS: PlutuGateway[] = [
  "localbankcards",
  "tlync",
  "mpgs",
];

// The exact param set (and order is irrelevant here — we preserve arrival order
// from the raw query) that each gateway includes in its signed callback.
export const CALLBACK_PARAMS: Record<string, string[]> = {
  localbankcards: [
    "gateway",
    "approved",
    "canceled",
    "invoice_no",
    "amount",
    "transaction_id",
  ],
  mpgs: [
    "gateway",
    "approved",
    "canceled",
    "amount",
    "currency",
    "invoice_no",
    "transaction_id",
  ],
  tlync: [
    "gateway",
    "approved",
    "invoice_no",
    "amount",
    "transaction_id",
    "payment_method",
  ],
};

export interface PlutuResult {
  ok: boolean;
  status: number;
  result?: Record<string, unknown>;
  message?: string;
  raw: unknown;
}

/**
 * POST to Plutu as application/x-www-form-urlencoded (matches the PHP SDK's
 * Guzzle form_params). Returns a normalized result.
 */
export async function callPlutu(
  gateway: PlutuGateway,
  action: "verify" | "confirm",
  params: Record<string, string | number>,
): Promise<PlutuResult> {
  const url = `${BASE_URL}/transaction/${gateway}/${action}`;
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) body.set(k, String(v));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-API-KEY": API_KEY,
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body,
  });

  let json: Record<string, unknown> = {};
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { message: text };
  }

  return {
    ok: res.ok && (json.status === 200 || json.status === undefined),
    status: typeof json.status === "number" ? json.status : res.status,
    result: (json.result as Record<string, unknown>) ?? undefined,
    message: (json.message as string) ?? undefined,
    raw: json,
  };
}

/**
 * Recompute the Plutu callback HMAC and constant-time compare it to `hashed`.
 *
 * The signed data is the gateway's callback params as a urlencoded query
 * string, in the order Plutu sent them. We rebuild it from the RAW query
 * substrings (excluding `hashed`) to byte-match what Plutu signed, then keep
 * only the keys in CALLBACK_PARAMS for that gateway.
 *
 * @param rawQuery the raw query string (no leading "?"), e.g. "gateway=..&amount=.."
 */
export async function verifyCallbackHash(
  gateway: string,
  rawQuery: string,
): Promise<boolean> {
  const allowed = CALLBACK_PARAMS[gateway];
  if (!allowed || !SECRET_KEY) return false;

  let received = "";
  const kept: string[] = [];
  for (const pair of rawQuery.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const key = decodeURIComponent(rawKey.replace(/\+/g, " "));
    if (key === "hashed") {
      received = decodeURIComponent(
        (eq === -1 ? "" : pair.slice(eq + 1)).replace(/\+/g, " "),
      );
      continue;
    }
    if (allowed.includes(key)) kept.push(pair);
  }

  if (!received) return false;
  const data = kept.join("&");

  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  const generated = [...new Uint8Array(sigBuf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  return timingSafeEqual(generated, received.toUpperCase());
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function approvedFlag(params: URLSearchParams | Record<string, string>) {
  const v = params instanceof URLSearchParams
    ? params.get("approved")
    : params["approved"];
  return v === "1" || v === "true";
}
