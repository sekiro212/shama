-- ===========================================================================
-- Influencer coupons & commission tracking
-- Spec: docs/superpowers/specs/2026-07-20-influencer-coupons-design.md
-- ===========================================================================

-- --------------------------------------------------------------------------
-- influencers
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS influencers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    VARCHAR(255) NOT NULL,
  phone                   VARCHAR(20),
  instagram_handle        VARCHAR(100),
  notes                   TEXT,
  default_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 3.00
                            CHECK (default_commission_rate >= 0 AND default_commission_rate <= 100),
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- influencer_payouts — ledger of payments already made to an influencer
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS influencer_payouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  amount        DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  paid_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  method        VARCHAR(30),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_influencer_payouts_influencer
  ON influencer_payouts(influencer_id);

-- --------------------------------------------------------------------------
-- promo_codes — link a code to an influencer with its own commission rate
-- --------------------------------------------------------------------------
ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS influencer_id UUID REFERENCES influencers(id) ON DELETE SET NULL;
ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2)
    CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100));

CREATE INDEX IF NOT EXISTS idx_promo_codes_influencer
  ON promo_codes(influencer_id) WHERE influencer_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- orders — the snapshot. Written ONLY by the trigger below.
-- --------------------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS influencer_id UUID REFERENCES influencers(id) ON DELETE SET NULL;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS influencer_commission_rate DECIMAL(5,2);

CREATE INDEX IF NOT EXISTS idx_orders_influencer
  ON orders(influencer_id) WHERE influencer_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- Snapshot trigger.
--
-- RLS is disabled entirely on `orders`, and the anon role holds both INSERT
-- and UPDATE, so anything the client sends in these two columns is forgeable.
-- The trigger ignores the incoming values
-- entirely and re-derives them from promo_codes. Snapshotting (rather than
-- joining at read time) also means editing a rate never rewrites commissions
-- that have already been paid out.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_order_influencer_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_influencer_id UUID;
  v_rate          DECIMAL(5,2);
BEGIN
  IF NEW.promo_code_id IS NOT NULL THEN
    SELECT pc.influencer_id, pc.commission_rate
      INTO v_influencer_id, v_rate
      FROM promo_codes pc
     WHERE pc.id = NEW.promo_code_id;
  END IF;

  IF v_influencer_id IS NULL THEN
    -- No promo code, or a plain non-influencer code: no commission at all.
    NEW.influencer_id              := NULL;
    NEW.influencer_commission_rate := NULL;
  ELSE
    NEW.influencer_id              := v_influencer_id;
    -- An influencer code with no rate set earns 0% rather than failing the insert.
    NEW.influencer_commission_rate := COALESCE(v_rate, 0);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_influencer_snapshot ON orders;
CREATE TRIGGER orders_influencer_snapshot
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_order_influencer_snapshot();

-- --------------------------------------------------------------------------
-- updated_at maintenance for influencers (mirrors the existing table pattern)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_influencers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS influencers_touch_updated_at ON influencers;
CREATE TRIGGER influencers_touch_updated_at
  BEFORE UPDATE ON influencers
  FOR EACH ROW EXECUTE FUNCTION touch_influencers_updated_at();

-- --------------------------------------------------------------------------
-- RLS — mirrors the open-policy pattern already used on orders/promo_codes.
-- This is deliberately consistent with the rest of the schema, NOT secure.
-- Locking these down is tracked in PENDING_security_hardening.sql.
-- --------------------------------------------------------------------------
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read influencers"   ON influencers FOR SELECT USING (true);
CREATE POLICY "Public insert influencers" ON influencers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update influencers" ON influencers FOR UPDATE USING (true);
CREATE POLICY "Public delete influencers" ON influencers FOR DELETE USING (true);

ALTER TABLE influencer_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read influencer payouts"   ON influencer_payouts FOR SELECT USING (true);
CREATE POLICY "Public insert influencer payouts" ON influencer_payouts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update influencer payouts" ON influencer_payouts FOR UPDATE USING (true);
CREATE POLICY "Public delete influencer payouts" ON influencer_payouts FOR DELETE USING (true);
