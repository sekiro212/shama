-- Telegram alerts for new orders — database-side trigger.
--
-- Fires the `notify-new-order` edge function on every order insert and on
-- every status change. Living in the database rather than in CheckoutPage.tsx
-- means it cannot be bypassed: the checkout page, the Plutu payment flow, the
-- admin panel and direct SQL inserts all go through it.
--
-- PREREQUISITES (do these first, in order):
--   1. Deploy the function:
--        supabase functions deploy notify-new-order
--   2. Set its secrets (never commit these values):
--        supabase secrets set TELEGRAM_BOT_TOKEN=... ADMIN_CHAT_IDS=...
--   3. Run this file in the Supabase SQL Editor, replacing <SERVICE_ROLE_KEY>
--      with Project Settings → API → service_role. Clear the editor output
--      afterwards; do not save the filled-in version anywhere.
--
-- Safe to run more than once.

-- pg_net drives the outbound HTTP call; the vault holds the key it needs.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1. Stash the service-role key so the trigger can authenticate to the
--    function. Reuses the same pattern as the vanex-sync cron job.
SELECT vault.create_secret(
  '<SERVICE_ROLE_KEY>',
  'order_notify_service_role_key',
  'Service role key used by the new-order Telegram trigger'
)
WHERE NOT EXISTS (
  SELECT 1 FROM vault.secrets WHERE name = 'order_notify_service_role_key'
);

-- 2. The trigger function.
--
--    SECURITY DEFINER so it can read the vault regardless of who inserted the
--    order (the checkout page inserts as the anon role).
--
--    The entire body is wrapped in an exception handler on purpose: an order
--    must NEVER fail to save because Telegram, pg_net or the vault had a bad
--    moment. A lost notification is an annoyance; a lost order is revenue.
--    Failures surface as warnings in the Postgres logs instead.
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_key   TEXT;
  v_event TEXT;
BEGIN
  v_event := CASE WHEN TG_OP = 'INSERT' THEN 'new_order' ELSE 'status_change' END;

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'order_notify_service_role_key';

  IF v_key IS NULL THEN
    RAISE WARNING 'notify_new_order: vault secret order_notify_service_role_key missing; skipping alert for order %', NEW.id;
    RETURN NEW;
  END IF;

  -- net.http_post queues the request and returns immediately, so the INSERT
  -- is never held up waiting on Telegram.
  PERFORM net.http_post(
    url := 'https://wdpldfemkbxjdveuieof.supabase.co/functions/v1/notify-new-order',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    -- to_jsonb(NEW) ships the whole row, so adding a column later needs no
    -- change here — the edge function reads what it recognises.
    body := jsonb_build_object(
      'event', v_event,
      'order', to_jsonb(NEW),
      'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END
    )
  );

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_new_order failed for order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Attach it. AFTER, so the row is committed-visible before we announce it.
DROP TRIGGER IF EXISTS orders_notify_telegram_insert ON public.orders;
CREATE TRIGGER orders_notify_telegram_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_order();

-- Status changes only — an unrelated column edit should not ping the phone.
DROP TRIGGER IF EXISTS orders_notify_telegram_status ON public.orders;
CREATE TRIGGER orders_notify_telegram_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_new_order();

-- Verify:
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.orders'::regclass;
--   -- then place a test order and check:
--   SELECT id, status_code, error_msg FROM net._http_response ORDER BY created DESC LIMIT 5;
