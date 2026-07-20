-- ===========================================================================
-- Influencer aggregation views (read-only)
-- ===========================================================================

-- --------------------------------------------------------------------------
-- Per-code breakdown.
--
-- Grouped by promo_code_snapshot (not promo_code_id) so history stays legible
-- after a code is deleted. The rate is part of the grouping key on purpose:
-- if a code's rate changes from 3% to 5% mid-campaign, the code yields two
-- rows, each with its own correct total, instead of one row with an ambiguous
-- displayed rate.
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW influencer_code_stats AS
SELECT
  o.influencer_id,
  o.promo_code_snapshot                   AS code,
  o.influencer_commission_rate            AS commission_rate,
  COUNT(*)::int                           AS orders_count,
  ROUND(SUM(o.subtotal - COALESCE(o.discount_amount, 0)), 2) AS gross_sales,
  ROUND(SUM(
    (o.subtotal - COALESCE(o.discount_amount, 0))
    * o.influencer_commission_rate / 100
  ), 2)                                   AS commission_due
FROM orders o
WHERE o.influencer_id IS NOT NULL
  AND o.status IN ('delivered', 'accepted')
GROUP BY o.influencer_id, o.promo_code_snapshot, o.influencer_commission_rate;

-- --------------------------------------------------------------------------
-- One line per influencer.
--
-- Orders, payouts, and code counts are aggregated in SEPARATE CTEs and then
-- LEFT JOINed. Joining the base tables before aggregating would fan out rows
-- and multiply every total. This shape is required, not stylistic.
--
-- codes_count includes codes with zero orders.
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW influencer_account_summary AS
WITH order_totals AS (
  SELECT
    influencer_id,
    COUNT(*)::int AS orders_count,
    SUM(subtotal - COALESCE(discount_amount, 0)) AS gross_sales,
    SUM(
      (subtotal - COALESCE(discount_amount, 0))
      * influencer_commission_rate / 100
    ) AS commission_earned
  FROM orders
  WHERE influencer_id IS NOT NULL
    AND status IN ('delivered', 'accepted')
  GROUP BY influencer_id
),
payout_totals AS (
  SELECT influencer_id, SUM(amount) AS total_paid
  FROM influencer_payouts
  GROUP BY influencer_id
),
code_counts AS (
  SELECT influencer_id, COUNT(*)::int AS codes_count
  FROM promo_codes
  WHERE influencer_id IS NOT NULL
  GROUP BY influencer_id
)
SELECT
  i.id                                              AS influencer_id,
  i.name,
  i.is_active,
  COALESCE(cc.codes_count, 0)                       AS codes_count,
  COALESCE(ot.orders_count, 0)                      AS orders_count,
  ROUND(COALESCE(ot.gross_sales, 0), 2)             AS gross_sales,
  ROUND(COALESCE(ot.commission_earned, 0), 2)       AS commission_earned,
  ROUND(COALESCE(pt.total_paid, 0), 2)              AS total_paid,
  ROUND(
    COALESCE(ot.commission_earned, 0) - COALESCE(pt.total_paid, 0), 2
  )                                                 AS balance_due
FROM influencers i
LEFT JOIN order_totals ot ON ot.influencer_id = i.id
LEFT JOIN payout_totals pt ON pt.influencer_id = i.id
LEFT JOIN code_counts  cc ON cc.influencer_id = i.id;
