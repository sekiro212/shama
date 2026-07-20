-- ===========================================================================
-- Influencer aggregation views — review fixes
--
-- Fixes three issues found in code review of 20260720_influencer_views.sql:
--
-- 1. Cross-view rounding drift. influencer_code_stats rounds commission per
--    (influencer, code, rate) group. influencer_account_summary previously
--    rounded ONCE across all of an influencer's orders. ROUND is not
--    additive, so the two screens could disagree by a cent (e.g. two codes
--    at 1% on 1000.50 orders: per-code rows sum to 20.02, old summary said
--    20.01). Since the admin UI shows both numbers side by side and the
--    whole point is "what do we pay this influencer", they must reconcile
--    by construction. Fix: order_totals now aggregates per
--    (influencer_id, promo_code_snapshot, influencer_commission_rate) FIRST,
--    rounding at that level exactly like influencer_code_stats, then sums
--    those already-rounded per-group values per influencer. The per-code
--    rounded figure is authoritative (it's what a human reads and pays
--    against) — influencer_code_stats itself is unchanged.
--
-- 2. NULL subtotal silently zeroing commission while still counting the
--    order. orders.subtotal is nullable (added by a later ALTER; historical
--    rows can be NULL). SUM(subtotal - ...) propagates NULL and SUM drops
--    it, so a qualifying order contributes 0 money but still increments
--    orders_count, with no error. Fix: COALESCE(subtotal, 0) everywhere
--    subtotal is used, in both views.
--
-- 3. Both views were missing security_invoker, newly introducing 2
--    ERROR-level "security_definer_view" advisor findings (views default to
--    creator-privilege execution, bypassing RLS on the underlying tables).
--    No behavior change today since the base tables are fully open, but
--    PENDING_security_hardening.sql is staged to lock down `influencers`
--    and `influencer_payouts`; without this, these views would silently
--    keep bypassing that lockdown forever. Fix: WITH (security_invoker =
--    true) on both views.
-- ===========================================================================

CREATE OR REPLACE VIEW influencer_code_stats
WITH (security_invoker = true) AS
SELECT
  o.influencer_id,
  o.promo_code_snapshot                   AS code,
  o.influencer_commission_rate            AS commission_rate,
  COUNT(*)::int                           AS orders_count,
  ROUND(SUM(COALESCE(o.subtotal, 0) - COALESCE(o.discount_amount, 0)), 2) AS gross_sales,
  ROUND(SUM(
    (COALESCE(o.subtotal, 0) - COALESCE(o.discount_amount, 0))
    * o.influencer_commission_rate / 100
  ), 2)                                   AS commission_due
FROM orders o
WHERE o.influencer_id IS NOT NULL
  AND o.status IN ('delivered', 'accepted')
GROUP BY o.influencer_id, o.promo_code_snapshot, o.influencer_commission_rate;

CREATE OR REPLACE VIEW influencer_account_summary
WITH (security_invoker = true) AS
WITH order_group_totals AS (
  -- Same grouping and rounding as influencer_code_stats, so the per-code
  -- breakdown and this summary always reconcile to the same cent.
  SELECT
    influencer_id,
    promo_code_snapshot,
    influencer_commission_rate,
    COUNT(*)::int AS orders_count,
    ROUND(SUM(COALESCE(subtotal, 0) - COALESCE(discount_amount, 0)), 2) AS gross_sales,
    ROUND(SUM(
      (COALESCE(subtotal, 0) - COALESCE(discount_amount, 0))
      * influencer_commission_rate / 100
    ), 2) AS commission_due
  FROM orders
  WHERE influencer_id IS NOT NULL
    AND status IN ('delivered', 'accepted')
  GROUP BY influencer_id, promo_code_snapshot, influencer_commission_rate
),
order_totals AS (
  SELECT
    influencer_id,
    SUM(orders_count)::int   AS orders_count,
    SUM(gross_sales)         AS gross_sales,
    SUM(commission_due)      AS commission_earned
  FROM order_group_totals
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
