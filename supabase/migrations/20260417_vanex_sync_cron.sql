-- Run this ONCE in the Supabase SQL Editor after the edge function
-- `sync-vanex-packages` is deployed and the `VANEX_TOKEN` edge function
-- secret is set.
--
-- It does two things:
--   1. Stashes the service-role key in Supabase Vault so pg_cron can call
--      the edge function with the correct Authorization header.
--   2. Schedules the sync to run every 15 minutes.
--
-- Replace <SERVICE_ROLE_KEY> with the value from
-- Project Settings → API → service_role key. Delete the SELECT result
-- output before sharing this file.

-- 1. Store the service role key in vault (safe to run multiple times)
SELECT vault.create_secret(
  '<SERVICE_ROLE_KEY>',
  'sync_vanex_service_role_key',
  'Service role key used by the vanex-sync cron job'
)
WHERE NOT EXISTS (
  SELECT 1 FROM vault.secrets WHERE name = 'sync_vanex_service_role_key'
);

-- 2. Remove any existing schedule so this script is idempotent
SELECT cron.unschedule('vanex-sync-15min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'vanex-sync-15min');

-- 3. Schedule the sync every 15 minutes
SELECT cron.schedule(
  'vanex-sync-15min',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://wdpldfemkbxjdveuieof.supabase.co/functions/v1/sync-vanex-packages',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'sync_vanex_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- Verify:
--   SELECT jobid, jobname, schedule FROM cron.job WHERE jobname = 'vanex-sync-15min';
--   SELECT * FROM cron.job_run_details WHERE jobid = <jobid> ORDER BY start_time DESC LIMIT 5;
