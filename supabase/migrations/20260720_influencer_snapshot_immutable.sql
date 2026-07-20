-- ===========================================================================
-- Influencer coupons — snapshot immutability & hardening follow-up
-- Fixes code-review findings on 20260720_influencer_coupons.sql:
--   1. (Critical) orders_influencer_snapshot only fires BEFORE INSERT. RLS is
--      disabled on `orders` and anon holds UPDATE, so the snapshot columns
--      were forgeable via PATCH. Fixed by preserving (not re-deriving) the
--      snapshot on UPDATE — see preserve_order_influencer_snapshot() below.
--   2. (Important) CREATE POLICY statements were not re-runnable.
--   3. (Important) touch_influencers_updated_at() had a mutable search_path.
--   4. (Minor) Revoke public EXECUTE on the trigger functions.
--   5. (Minor) Bound orders.influencer_commission_rate with a CHECK.
-- ===========================================================================

-- --------------------------------------------------------------------------
-- Fix 1 (Critical): freeze the snapshot against UPDATE.
--
-- Do NOT re-derive from promo_codes here. Re-deriving on update would defeat
-- the entire point of the snapshot: when an admin later moves an order to
-- `delivered`, this trigger would overwrite the frozen rate with whatever
-- promo_codes.commission_rate says *today*, retroactively rewriting
-- commissions that were already paid out. Instead, any UPDATE that tries to
-- change either snapshot column is silently discarded — the columns are
-- pinned to their pre-update (frozen at insert time) values.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION preserve_order_influencer_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- The snapshot is frozen at insert time. Any UPDATE that tries to change it
  -- is discarded: re-deriving from promo_codes here would let a later coupon
  -- rate edit retroactively rewrite commissions that were already paid.
  NEW.influencer_id              := OLD.influencer_id;
  NEW.influencer_commission_rate := OLD.influencer_commission_rate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_influencer_snapshot_immutable ON orders;
CREATE TRIGGER orders_influencer_snapshot_immutable
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION preserve_order_influencer_snapshot();

-- --------------------------------------------------------------------------
-- Fix 3 (Important): touch_influencers_updated_at() had a mutable
-- search_path (flagged by Supabase advisor as function_search_path_mutable).
-- Re-create with SET search_path = public, matching set_order_influencer_snapshot().
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_influencers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- Fix 4 (Minor): revoke public EXECUTE on all three trigger functions. They
-- are only ever invoked by the trigger mechanism (as table owner), never
-- called directly by client roles.
-- --------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION set_order_influencer_snapshot() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION preserve_order_influencer_snapshot() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION touch_influencers_updated_at() FROM PUBLIC;

-- --------------------------------------------------------------------------
-- Fix 5 (Minor): bound orders.influencer_commission_rate, mirroring the
-- CHECK already present on promo_codes.commission_rate. Guards against a
-- forged or corrupted value ending up out of range.
-- --------------------------------------------------------------------------
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_influencer_commission_rate_check;
ALTER TABLE orders ADD CONSTRAINT orders_influencer_commission_rate_check
  CHECK (influencer_commission_rate IS NULL OR (influencer_commission_rate >= 0 AND influencer_commission_rate <= 100));

-- --------------------------------------------------------------------------
-- Fix 2 (Important): make the 8 CREATE POLICY statements from
-- 20260720_influencer_coupons.sql re-runnable, matching the guarded
-- convention already used in PENDING_security_hardening.sql.
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read influencers" ON influencers;
CREATE POLICY "Public read influencers"   ON influencers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert influencers" ON influencers;
CREATE POLICY "Public insert influencers" ON influencers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public update influencers" ON influencers;
CREATE POLICY "Public update influencers" ON influencers FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Public delete influencers" ON influencers;
CREATE POLICY "Public delete influencers" ON influencers FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public read influencer payouts" ON influencer_payouts;
CREATE POLICY "Public read influencer payouts"   ON influencer_payouts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert influencer payouts" ON influencer_payouts;
CREATE POLICY "Public insert influencer payouts" ON influencer_payouts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public update influencer payouts" ON influencer_payouts;
CREATE POLICY "Public update influencer payouts" ON influencer_payouts FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Public delete influencer payouts" ON influencer_payouts;
CREATE POLICY "Public delete influencer payouts" ON influencer_payouts FOR DELETE USING (true);
