# Plutu Payment Integration — Design

Date: 2026-06-26
Status: Approved (design), implementation in progress

## Goal
Add Plutu (https://plutu.ly) online payments to Shama checkout, alongside the
existing Cash-on-Delivery (`cod`) and Bank Transfer (`bank_transfer`) methods.
All five Plutu gateways: Adfali (`edfali`), Sadad (`sadadapi`), Local Bank Cards
(`localbankcards`), T-Lync (`tlync`), MPGS (`mpgs`).

## Constraints
- Frontend is a static SPA on cPanel — **no secrets in the bundle**. Plutu API
  key / access token / secret key live only in Supabase Edge Function secrets.
- Dynamic logic must live in Supabase Edge Functions (Deno), matching the
  existing `send-email` / `unsubscribe` pattern.
- IP whitelist is **optional** in Plutu and left OFF (Supabase egress IP varies).

## Plutu API reference (verified from getplutu/plutu-php)
- Base URL: `https://api.plutus.ly/api/v1/transaction/{gateway}/{action}`
- Headers: `Accept: application/json`, `X-API-KEY: <key>`,
  `Authorization: Bearer <accessToken>`
- Two flow shapes:
  - **OTP (server-to-server)** — Adfali/Sadad:
    - `verify` → `{ result: { process_id }, message }` (OTP texted to customer)
    - `confirm` → `{ result: { transaction_id, amount } }`
    - Adfali verify params: `mobile_number`, `amount`
    - Sadad verify params: `mobile_number`, `birth_year`, `amount`
    - confirm params (both): `process_id`, `code`, `amount`, `invoice_no`,
      optional `customer_ip`
    - Mobile regex: Adfali `^09[1-6][0-9]{7}$`, Sadad `^09[13][0-9]{7}$`
  - **Redirect + callback** — Local Bank Cards / MPGS / T-Lync:
    - `confirm` → `{ result: { redirect_url } }`; browser is sent there.
    - localbankcards/mpgs confirm: `amount`, `invoice_no`, `return_url`,
      optional `lang`, `customer_ip`. (mpgs identical.)
    - tlync confirm also needs: `mobile_number`, `callback_url`.
    - On completion Plutu appends signed params to the return/callback URL.
- **Callback HMAC verification** — `strtoupper(hmac_sha256(data, secretKey))`
  compared to the `hashed` param. `data` = url-encoded query string of only the
  gateway's callback params, in the order they arrive. Allowed param sets:
  - localbankcards: `gateway, approved, canceled, invoice_no, amount, transaction_id`
  - mpgs: `gateway, approved, canceled, amount, currency, invoice_no, transaction_id`
  - tlync: `gateway, approved, invoice_no, amount, transaction_id, payment_method`
  - `approved == 1` means success.

## Database
Migration adds to `public.orders`:
- `payment_status` varchar default `'unpaid'`, check in (`unpaid`,`paid`,`failed`)
- `payment_gateway` varchar null (the Plutu gateway id)
- `payment_reference` varchar null (Plutu `transaction_id`)

`payment_method` is varchar with no check — Plutu orders store the gateway id
there too (e.g. `edfali`). `invoice_no` sent to Plutu = the order row `id`.

> NOTE: `orders` has RLS disabled (pre-existing). Anyone with the anon key can
> read/modify rows, including `payment_status`. The **source of truth for "paid"
> is the edge function** (service role, after Plutu confirms / valid HMAC). The
> client never sets `payment_status='paid'` itself. Tightening RLS is out of
> scope but flagged.

## Edge Functions
### `plutu-payment` (verify_jwt = true — browser invoke carries anon/user JWT)
Body `{ action, orderId, ... }`. Always loads the order row and uses
`order.total` as the amount (never trusts a client amount). `invoice_no = orderId`.
Actions:
- `otp_verify` `{ orderId, gateway, mobile_number, birth_year? }` → Plutu verify →
  `{ process_id }`.
- `otp_confirm` `{ orderId, gateway, process_id, code }` → Plutu confirm → on
  success set `payment_status='paid'`, `payment_reference=transaction_id` →
  `{ paid:true, transaction_id }`.
- `card_initiate` `{ orderId, gateway, mobile_number?, lang }` → Plutu confirm
  with `return_url = ${SITE_URL}/order-success/${orderId}` and (tlync)
  `callback_url = ${FN_BASE}/plutu-callback` → `{ redirect_url }`.

### `plutu-callback` (verify_jwt = false — public)
Authoritative paid-marker for redirect flows. Accepts params via GET query
(Plutu's direct tlync callback) or POST JSON (forwarded by OrderSuccessPage for
localbankcards/mpgs, which only get a browser `return_url`). Steps: pick the
gateway's allowed param set, rebuild the raw filtered query string in arrival
order, HMAC-verify against `hashed`; if valid and `approved==1`, mark the order
(`invoice_no`) `payment_status='paid'`, store `transaction_id`. Returns
`{ paid, orderId, status }`. Never trusts `approved` without a valid hash.

Secrets: `PLUTU_API_KEY`, `PLUTU_ACCESS_TOKEN`, `PLUTU_SECRET_KEY`,
`PLUTU_BASE_URL` (default `https://api.plutus.ly/api/v1`), `SITE_URL`,
`FUNCTIONS_BASE_URL`.

## Frontend
- `src/services/plutuService.ts` — wrappers over `supabase.functions.invoke`:
  `otpVerify`, `otpConfirm`, `cardInitiate`, `verifyCardReturn(rawQuery)`.
- `PaymentMethod` union extended to: `cod | bank_transfer | edfali | sadadapi |
  localbankcards | tlync | mpgs` (plutu method value == gateway id).
- `PaymentSection.tsx` — group: COD, Bank Transfer, and a "Pay online" set of the
  five Plutu cards, each with a localized hint. No inline proof for Plutu.
- `PlutuOtpDialog.tsx` (new) — modal for Adfali/Sadad: step 1 collect mobile
  (+ birth year for Sadad) → send OTP; step 2 enter OTP → confirm. Uses
  `LoadingButton`, sonner toasts, bilingual.
- `CheckoutPage.handleSubmit` branches by method:
  - `cod` / `bank_transfer` — unchanged (order created, navigate success).
  - OTP gateways — create order (`payment_status='unpaid'`), open
    `PlutuOtpDialog`; on confirm success navigate `/order-success/:id`.
  - card gateways — create order (`unpaid`) → `cardInitiate` →
    `window.location.href = redirect_url`.
- `OrderSuccessPage` — on mount, if the URL carries Plutu return params
  (`hashed` present), POST the raw query to `verifyCardReturn`, then reflect
  paid/failed. Show payment status badge for all Plutu orders.

## Order lifecycle
Order is always inserted first as `unpaid`. It only becomes `paid` via the edge
function (Plutu confirm success, or a valid HMAC callback). Abandoned/failed
payments leave the order `unpaid` and retryable.

## Translations
New keys under `checkout.payment.*` (method labels + hints) and a new
`checkout.plutu.*` section (OTP dialog copy, statuses) in `en.json` + `ar.json`.

## Testing
- Local unit test for the HMAC verifier (known vector) — pure function, isolate
  in the edge function as an exported helper.
- Manual sandbox run with the test access token: one OTP (Adfali) + one card
  (Local Bank Cards) end-to-end. The other three reuse the same code paths.

## Build order
1. DB migration.
2. `plutu-payment` + `plutu-callback` edge functions (+ shared plutu helper).
3. Frontend service + types.
4. PaymentSection + OTP dialog + CheckoutPage wiring.
5. OrderSuccessPage return handling.
6. Translations.
7. Deploy functions, set secrets, sandbox test.
