-- Vanex delivery tracking — admin-side sync
-- Adds columns to orders so a scheduled Supabase edge function
-- (`sync-vanex-packages`) can mirror Vanex-reported package status
-- without overwriting the admin-controlled `orders.status`.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS vanex_package_id INTEGER,
  ADD COLUMN IF NOT EXISTS vanex_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS vanex_status_ar VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vanex_current_location VARCHAR(200),
  ADD COLUMN IF NOT EXISTS vanex_estimated_delivery DATE,
  ADD COLUMN IF NOT EXISTS vanex_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vanex_logs JSONB;

CREATE INDEX IF NOT EXISTS orders_vanex_sync_candidates_idx
  ON public.orders (vanex_status)
  WHERE vanex_package_code IS NOT NULL
    AND (vanex_status IS NULL OR vanex_status NOT IN ('delivered','cancelled','returned'));

COMMENT ON COLUMN public.orders.vanex_package_id        IS 'Numeric Vanex package id — needed for cancel/recall endpoints';
COMMENT ON COLUMN public.orders.vanex_status            IS 'Vanex-reported status (English). Never overwrites orders.status.';
COMMENT ON COLUMN public.orders.vanex_status_ar         IS 'Vanex-reported status (Arabic)';
COMMENT ON COLUMN public.orders.vanex_current_location  IS 'Current Vanex location string';
COMMENT ON COLUMN public.orders.vanex_estimated_delivery IS 'ETA returned by Vanex';
COMMENT ON COLUMN public.orders.vanex_last_synced_at    IS 'Last time the edge function refreshed tracking data';
COMMENT ON COLUMN public.orders.vanex_logs              IS 'Full PackageLog[] history from /customer/package/{code}/logs';
