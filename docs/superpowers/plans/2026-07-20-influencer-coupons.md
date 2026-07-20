# Influencer Coupons & Commission Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assign coupons to influencers with a per-code commission rate, and aggregate qualifying orders per code and per influencer so payouts are read off one admin screen instead of computed by hand.

**Architecture:** Additive. Two new tables (`influencers`, `influencer_payouts`), two new columns each on `promo_codes` and `orders`, a `BEFORE INSERT` trigger that snapshots the influencer and rate onto every order server-side, and two read-only views that do the aggregation. The frontend order path (`CheckoutPage.tsx`) is not touched. A new `/admin/influencers` section follows the existing modular admin tree.

**Tech Stack:** Supabase Postgres (SQL migrations + views + PL/pgSQL trigger), React 18 + TypeScript, Tailwind, shadcn/ui, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-20-influencer-coupons-design.md`

## Global Constraints

- **Commission base:** `subtotal - discount_amount`. Delivery fee excluded. Never `total`.
- **Qualifying statuses:** `'delivered'` and `'accepted'` only. Everything else contributes zero.
- **Defaults:** `default_commission_rate` = `3.00`. Discount stays the existing `discount_type='percentage'` + `discount_value=5`. No new discount column.
- **The commission rate on an order is written only by the DB trigger.** Never send `influencer_id` or `influencer_commission_rate` from the client. `orders` carries an open public-insert policy, so a client-supplied rate is forgeable.
- **Commission amount is never stored.** Always derived in the views.
- **Bilingual:** every user-facing string goes through `t("...")` with keys in both `src/locales/en.json` and `src/locales/ar.json`. No hardcoded English in components.
- **RTL:** use `ms-*`/`me-*` not `ml-*`/`mr-*`; add `rtl:space-x-reverse` to `space-x-*`; `side={isRTL ? "left" : "right"}` on Sheets.
- **Service layer:** no component queries Supabase directly. All access goes through `src/services/influencersService.ts`.
- **Admin buttons:** use `<LoadingButton>` from `@/components/ui/loading-button` for async actions, not `<Button disabled>`.
- **Migrations:** apply with `mcp__supabase__apply_migration`, and keep the file in `supabase/migrations/`.

### Deviation from the spec

The spec's `influencer_code_stats` view lists a `promo_code_id` column. It is dropped here. The view groups by `promo_code_snapshot`, and `orders.promo_code_id` is `ON DELETE SET NULL`, so a deleted code would split one code's history into two rows. Postgres also has no `min()`/`max()` aggregate for `uuid` to collapse it. The UI keys on `code`, which is the durable value. Everything else follows the spec.

### No unit test framework in this repo

`package.json` has only `test:e2e` (Playwright). There is no vitest/jest. So:
- **DB tasks** are tested with SQL assertion queries run through `mcp__supabase__execute_sql`, wrapped in a transaction that is rolled back so no test data survives.
- **Frontend tasks** are verified with `npm run build` (which runs `tsc`), `npm run lint`, and the Playwright spec in Task 9.

---

### Task 1: Database — tables, columns, and the snapshot trigger

**Files:**
- Create: `supabase/migrations/20260720_influencer_coupons.sql`
- Modify: `supabase_schema.sql` (append the same SQL to keep the tracked schema in sync)
- Modify: `supabase/migrations/PENDING_security_hardening.sql` (append a note)

**Interfaces:**
- Consumes: nothing.
- Produces: tables `influencers`, `influencer_payouts`; columns `promo_codes.influencer_id`, `promo_codes.commission_rate`, `orders.influencer_id`, `orders.influencer_commission_rate`; trigger `orders_influencer_snapshot`. Task 2 reads all of these.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260720_influencer_coupons.sql`:

```sql
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
-- `orders` carries an open public-insert policy, so anything the client sends
-- in these two columns is forgeable. The trigger ignores the incoming values
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
```

- [ ] **Step 2: Note the new tables in the pending hardening migration**

Append to the end of `supabase/migrations/PENDING_security_hardening.sql`:

```sql
-- ---------------------------------------------------------------------------
-- TODO (added 2026-07-20 with the influencer coupons feature):
-- `influencers` and `influencer_payouts` shipped with the same open public
-- policies as orders/promo_codes for consistency. They expose influencer names,
-- phone numbers, and payout amounts to the anon key. Lock both down to the
-- admin role in the same pass that fixes orders and promo_codes.
-- ---------------------------------------------------------------------------
```

- [ ] **Step 3: Apply the migration**

Apply the file contents with `mcp__supabase__apply_migration`, name `20260720_influencer_coupons`.

Expected: success, no error.

- [ ] **Step 4: Verify the trigger discards client-supplied values**

This is the security-critical assertion. Run with `mcp__supabase__execute_sql`:

```sql
BEGIN;

INSERT INTO influencers (name, default_commission_rate)
VALUES ('TEST_INFLUENCER', 3.00);

INSERT INTO promo_codes (code, discount_type, discount_value, min_order_total, scope, is_active, influencer_id, commission_rate)
SELECT 'TESTINF5', 'percentage', 5, 0, 'all_products', true, id, 3.00
FROM influencers WHERE name = 'TEST_INFLUENCER';

-- The client lies: claims a different influencer and a 99% rate.
INSERT INTO orders (first_name, last_name, email, phone, city, subtotal, discount_amount, total, status, items, promo_code_id, promo_code_snapshot, influencer_id, influencer_commission_rate)
SELECT 'T','T','t@t.t','0','Tripoli', 1000, 50, 950, 'delivered', '[]'::jsonb, pc.id, 'TESTINF5', gen_random_uuid(), 99.00
FROM promo_codes pc WHERE pc.code = 'TESTINF5';

SELECT
  o.influencer_commission_rate                        AS actual_rate,
  (o.influencer_id = i.id)                            AS influencer_matches_code,
  (o.influencer_commission_rate = 3.00)               AS rate_was_overridden
FROM orders o
JOIN influencers i ON i.name = 'TEST_INFLUENCER'
WHERE o.promo_code_snapshot = 'TESTINF5';

ROLLBACK;
```

Expected: one row with `actual_rate = 3.00`, `influencer_matches_code = true`, `rate_was_overridden = true`. If `actual_rate` is `99.00`, the trigger did not fire — stop and fix before continuing.

- [ ] **Step 5: Verify an order with no promo code gets NULLs**

```sql
BEGIN;
INSERT INTO orders (first_name, last_name, email, phone, city, subtotal, discount_amount, total, status, items)
VALUES ('T','T','none@t.t','0','Tripoli', 500, 0, 500, 'delivered', '[]'::jsonb);

SELECT influencer_id IS NULL AS no_influencer,
       influencer_commission_rate IS NULL AS no_rate
FROM orders WHERE email = 'none@t.t';
ROLLBACK;
```

Expected: `no_influencer = true`, `no_rate = true`.

- [ ] **Step 6: Sync the tracked schema file**

Append the full contents of `supabase/migrations/20260720_influencer_coupons.sql` to the end of `supabase_schema.sql`, under a comment header:

```sql
-- ===========================================================================
-- 2026-07-20 — Influencer coupons & commission tracking
-- ===========================================================================
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260720_influencer_coupons.sql supabase/migrations/PENDING_security_hardening.sql supabase_schema.sql
git commit -m "feat(db): influencer tables, coupon commission columns, and order snapshot trigger

Commission rate is snapshotted onto each order by a BEFORE INSERT trigger
rather than accepted from the client, since orders carries an open public
insert policy. Snapshotting also freezes the rate at order time so editing
a coupon never rewrites commissions already paid."
```

---

### Task 2: Database — aggregation views

**Files:**
- Create: `supabase/migrations/20260720_influencer_views.sql`
- Modify: `supabase_schema.sql` (append)

**Interfaces:**
- Consumes: everything from Task 1.
- Produces: views `influencer_code_stats` and `influencer_account_summary`. Task 4 reads both.
  - `influencer_code_stats(influencer_id uuid, code text, commission_rate numeric, orders_count int, gross_sales numeric, commission_due numeric)`
  - `influencer_account_summary(influencer_id uuid, name text, is_active boolean, codes_count int, orders_count int, gross_sales numeric, commission_earned numeric, total_paid numeric, balance_due numeric)`

- [ ] **Step 1: Write the views migration**

Create `supabase/migrations/20260720_influencer_views.sql`:

```sql
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
```

- [ ] **Step 2: Apply the migration**

Apply with `mcp__supabase__apply_migration`, name `20260720_influencer_views`.

- [ ] **Step 3: Verify status filtering, code aggregation, and rate splitting**

```sql
BEGIN;

INSERT INTO influencers (name, default_commission_rate) VALUES ('VIEWTEST', 3.00);

INSERT INTO promo_codes (code, discount_type, discount_value, min_order_total, scope, is_active, influencer_id, commission_rate)
SELECT 'VT5', 'percentage', 5, 0, 'all_products', true, id, 3.00
FROM influencers WHERE name = 'VIEWTEST';

-- Two qualifying orders on the same code at 3%: subtotal 1000, discount 50 -> base 950
INSERT INTO orders (first_name,last_name,email,phone,city,subtotal,discount_amount,total,delivery_fee,status,items,promo_code_id,promo_code_snapshot)
SELECT 'A','A','a@t.t','0','Tripoli',1000,50,950,30,'delivered','[]'::jsonb,id,'VT5' FROM promo_codes WHERE code='VT5';
INSERT INTO orders (first_name,last_name,email,phone,city,subtotal,discount_amount,total,delivery_fee,status,items,promo_code_id,promo_code_snapshot)
SELECT 'B','B','b@t.t','0','Tripoli',1000,50,950,30,'accepted','[]'::jsonb,id,'VT5' FROM promo_codes WHERE code='VT5';

-- One returned order on the same code: must contribute nothing.
INSERT INTO orders (first_name,last_name,email,phone,city,subtotal,discount_amount,total,delivery_fee,status,items,promo_code_id,promo_code_snapshot)
SELECT 'C','C','c@t.t','0','Tripoli',9999,0,9999,30,'returned','[]'::jsonb,id,'VT5' FROM promo_codes WHERE code='VT5';

-- Now raise the rate to 5% and place one more order.
UPDATE promo_codes SET commission_rate = 5.00 WHERE code = 'VT5';
INSERT INTO orders (first_name,last_name,email,phone,city,subtotal,discount_amount,total,delivery_fee,status,items,promo_code_id,promo_code_snapshot)
SELECT 'D','D','d@t.t','0','Tripoli',1000,50,950,30,'delivered','[]'::jsonb,id,'VT5' FROM promo_codes WHERE code='VT5';

SELECT code, commission_rate, orders_count, gross_sales, commission_due
FROM influencer_code_stats
WHERE influencer_id = (SELECT id FROM influencers WHERE name='VIEWTEST')
ORDER BY commission_rate;

ROLLBACK;
```

Expected exactly two rows:

| code | commission_rate | orders_count | gross_sales | commission_due |
|------|-----------------|--------------|-------------|----------------|
| VT5  | 3.00            | 2            | 1900.00     | 57.00          |
| VT5  | 5.00            | 1            | 950.00      | 47.50          |

Key things this proves: the `returned` order is absent; delivery fee is excluded (base is 950, not 980); the pre-existing orders kept 3% after the rate was raised.

- [ ] **Step 4: Verify payouts do not multiply the totals**

```sql
BEGIN;

INSERT INTO influencers (name, default_commission_rate) VALUES ('PAYTEST', 3.00);
INSERT INTO promo_codes (code, discount_type, discount_value, min_order_total, scope, is_active, influencer_id, commission_rate)
SELECT 'PT5','percentage',5,0,'all_products',true,id,3.00 FROM influencers WHERE name='PAYTEST';

-- 2 orders, base 950 each -> commission 28.50 each -> 57.00 total
INSERT INTO orders (first_name,last_name,email,phone,city,subtotal,discount_amount,total,status,items,promo_code_id,promo_code_snapshot)
SELECT 'A','A','pa@t.t','0','Tripoli',1000,50,950,'delivered','[]'::jsonb,id,'PT5' FROM promo_codes WHERE code='PT5';
INSERT INTO orders (first_name,last_name,email,phone,city,subtotal,discount_amount,total,status,items,promo_code_id,promo_code_snapshot)
SELECT 'B','B','pb@t.t','0','Tripoli',1000,50,950,'delivered','[]'::jsonb,id,'PT5' FROM promo_codes WHERE code='PT5';

-- 3 separate payouts totalling 20.00
INSERT INTO influencer_payouts (influencer_id, amount, method)
SELECT id, 10.00, 'cash' FROM influencers WHERE name='PAYTEST';
INSERT INTO influencer_payouts (influencer_id, amount, method)
SELECT id, 5.00, 'cash' FROM influencers WHERE name='PAYTEST';
INSERT INTO influencer_payouts (influencer_id, amount, method)
SELECT id, 5.00, 'transfer' FROM influencers WHERE name='PAYTEST';

SELECT codes_count, orders_count, gross_sales, commission_earned, total_paid, balance_due
FROM influencer_account_summary WHERE name = 'PAYTEST';

ROLLBACK;
```

Expected exactly one row: `codes_count=1`, `orders_count=2`, `gross_sales=1900.00`, `commission_earned=57.00`, `total_paid=20.00`, `balance_due=37.00`.

If `orders_count` is 6 or `gross_sales` is 5700, the CTEs were collapsed into a direct join — fix before continuing.

- [ ] **Step 5: Verify an influencer with no orders still appears**

```sql
BEGIN;
INSERT INTO influencers (name) VALUES ('EMPTYTEST');
SELECT name, codes_count, orders_count, commission_earned, balance_due
FROM influencer_account_summary WHERE name = 'EMPTYTEST';
ROLLBACK;
```

Expected: one row, all numeric columns `0`. A missing row means the `LEFT JOIN`s were written as inner joins.

- [ ] **Step 6: Sync the schema file and commit**

Append the views SQL to `supabase_schema.sql`, then:

```bash
git add supabase/migrations/20260720_influencer_views.sql supabase_schema.sql
git commit -m "feat(db): influencer per-code and per-account aggregation views

Orders, payouts, and code counts are aggregated in separate CTEs before
being joined; a direct join across the base tables would fan out and
multiply every total."
```

---

### Task 3: Translation keys

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/ar.json`

**Interfaces:**
- Consumes: nothing.
- Produces: the `admin.influencers.*` key namespace, plus three keys under `admin.coupons.*` and one under `admin.nav.*`. Tasks 5, 7, and 8 all call `t()` with these exact keys.

- [ ] **Step 1: Add the English keys**

In `src/locales/en.json`, inside the existing `admin` object, add `"influencers"` as a sibling of `"coupons"`:

```json
"influencers": {
  "title": "Influencers",
  "subtitle": "Commission tracking and payouts",
  "create": "Add Influencer",
  "edit": "Edit Influencer",
  "empty": "No influencers yet",
  "emptyHint": "Add an influencer, then assign a coupon to them.",
  "name": "Name",
  "namePlaceholder": "e.g. Sara Ahmed",
  "phone": "Phone",
  "instagram": "Instagram",
  "instagramPlaceholder": "@handle",
  "notes": "Notes",
  "defaultRate": "Default commission rate (%)",
  "active": "Active",
  "codesCount": "Codes",
  "ordersCount": "Orders",
  "grossSales": "Sales",
  "commissionEarned": "Commission",
  "totalPaid": "Paid",
  "balanceDue": "Balance due",
  "viewStatement": "Statement",
  "statementTitle": "Account statement",
  "codeBreakdown": "Per-code breakdown",
  "code": "Code",
  "discountRate": "Discount",
  "commissionRate": "Commission %",
  "commissionDue": "Commission",
  "noOrders": "No qualifying orders yet",
  "noOrdersHint": "Only delivered and accepted orders count toward commission.",
  "payouts": "Payments",
  "noPayouts": "No payments recorded",
  "recordPayout": "Record payment",
  "payoutAmount": "Amount",
  "payoutMethod": "Method",
  "payoutMethodCash": "Cash",
  "payoutMethodTransfer": "Transfer",
  "payoutNote": "Note",
  "payoutDate": "Date",
  "overpayWarning": "This is more than the outstanding balance.",
  "validation": {
    "nameRequired": "Name is required",
    "rateRange": "Commission rate must be between 0 and 100",
    "amountRequired": "Enter an amount greater than zero"
  },
  "confirm": {
    "delete": "Delete this influencer? Their coupons will be unlinked but past orders keep their recorded commission.",
    "deleteWithCodes": "This influencer has {count} coupon(s). Deleting will unlink them. Past orders keep their recorded commission."
  },
  "toast": {
    "loadFailed": "Failed to load influencers",
    "created": "Influencer added",
    "updated": "Influencer updated",
    "deleted": "Influencer deleted",
    "saveFailed": "Failed to save influencer",
    "deleteFailed": "Failed to delete influencer",
    "payoutRecorded": "Payment recorded",
    "payoutFailed": "Failed to record payment"
  }
}
```

Add to the existing `admin.nav` object:

```json
"influencers": "Influencers"
```

Add to the existing `admin.coupons` object:

```json
"influencer": "Influencer",
"influencerNone": "None",
"influencerHint": "Assigning an influencer tracks commission on orders using this code.",
"commissionRate": "Commission rate (%)"
```

- [ ] **Step 2: Add the Arabic keys**

In `src/locales/ar.json`, inside the existing `admin` object, add:

```json
"influencers": {
  "title": "المشاهير",
  "subtitle": "تتبّع العمولات والمدفوعات",
  "create": "إضافة مشهور",
  "edit": "تعديل مشهور",
  "empty": "لا يوجد مشاهير بعد",
  "emptyHint": "أضف مشهورًا، ثم اربط كوبونًا به.",
  "name": "الاسم",
  "namePlaceholder": "مثال: سارة أحمد",
  "phone": "الهاتف",
  "instagram": "إنستغرام",
  "instagramPlaceholder": "@الحساب",
  "notes": "ملاحظات",
  "defaultRate": "نسبة العمولة الافتراضية (%)",
  "active": "نشط",
  "codesCount": "الأكواد",
  "ordersCount": "الطلبات",
  "grossSales": "المبيعات",
  "commissionEarned": "العمولة",
  "totalPaid": "المدفوع",
  "balanceDue": "المتبقي",
  "viewStatement": "قائمة الحساب",
  "statementTitle": "قائمة الحساب",
  "codeBreakdown": "تفصيل الأكواد",
  "code": "الكود",
  "discountRate": "الخصم",
  "commissionRate": "نسبة العمولة %",
  "commissionDue": "العمولة",
  "noOrders": "لا توجد طلبات مؤهّلة بعد",
  "noOrdersHint": "تُحتسب العمولة على الطلبات المُسلَّمة والمقبولة فقط.",
  "payouts": "المدفوعات",
  "noPayouts": "لم تُسجَّل أي دفعات",
  "recordPayout": "تسجيل دفعة",
  "payoutAmount": "المبلغ",
  "payoutMethod": "الطريقة",
  "payoutMethodCash": "نقدًا",
  "payoutMethodTransfer": "تحويل",
  "payoutNote": "ملاحظة",
  "payoutDate": "التاريخ",
  "overpayWarning": "هذا المبلغ أكبر من الرصيد المتبقي.",
  "validation": {
    "nameRequired": "الاسم مطلوب",
    "rateRange": "نسبة العمولة يجب أن تكون بين 0 و100",
    "amountRequired": "أدخل مبلغًا أكبر من صفر"
  },
  "confirm": {
    "delete": "حذف هذا المشهور؟ ستُفَك أكواده لكن الطلبات السابقة تحتفظ بعمولتها المسجّلة.",
    "deleteWithCodes": "لهذا المشهور {count} كوبون. الحذف سيفكّ ارتباطها. الطلبات السابقة تحتفظ بعمولتها المسجّلة."
  },
  "toast": {
    "loadFailed": "فشل تحميل المشاهير",
    "created": "تمت إضافة المشهور",
    "updated": "تم تحديث المشهور",
    "deleted": "تم حذف المشهور",
    "saveFailed": "فشل حفظ المشهور",
    "deleteFailed": "فشل حذف المشهور",
    "payoutRecorded": "تم تسجيل الدفعة",
    "payoutFailed": "فشل تسجيل الدفعة"
  }
}
```

Add to `admin.nav`:

```json
"influencers": "المشاهير"
```

Add to `admin.coupons`:

```json
"influencer": "المشهور",
"influencerNone": "بدون",
"influencerHint": "ربط مشهور بهذا الكود يفعّل تتبّع العمولة على الطلبات التي تستخدمه.",
"commissionRate": "نسبة العمولة (%)"
```

- [ ] **Step 3: Verify both files parse and have matching key sets**

```bash
node -e "
const en=require('./src/locales/en.json'), ar=require('./src/locales/ar.json');
const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v!==null?flat(v,p+k+'.'):[p+k]);
const e=new Set(flat(en.admin.influencers)), a=new Set(flat(ar.admin.influencers));
const missing=[...e].filter(k=>!a.has(k)), extra=[...a].filter(k=>!e.has(k));
console.log('missing in ar:', missing, 'extra in ar:', extra);
"
```

Expected: `missing in ar: [] extra in ar: []`

- [ ] **Step 4: Commit**

```bash
git add src/locales/en.json src/locales/ar.json
git commit -m "feat(i18n): add influencer admin translation keys in en and ar"
```

---

### Task 4: Influencers service layer

**Files:**
- Create: `src/services/influencersService.ts`

**Interfaces:**
- Consumes: the tables and views from Tasks 1 and 2.
- Produces: the types and functions below. Tasks 5, 6, 7, and 8 import from here.

```ts
export interface Influencer { id, name, phone, instagram_handle, notes,
  default_commission_rate: number, is_active: boolean, created_at, updated_at }
export interface InfluencerPayload { name, phone, instagram_handle, notes,
  default_commission_rate: number, is_active: boolean }
export interface InfluencerAccountSummary { influencer_id, name, is_active,
  codes_count, orders_count, gross_sales, commission_earned, total_paid, balance_due }
export interface InfluencerCodeStat { influencer_id, code, commission_rate,
  orders_count, gross_sales, commission_due }
export interface InfluencerPayout { id, influencer_id, amount, paid_at, method, note, created_at }
export interface InfluencerPayoutPayload { influencer_id, amount, method, note }

fetchInfluencers(): Promise<Influencer[]>
fetchInfluencerSummaries(): Promise<InfluencerAccountSummary[]>
fetchInfluencerCodeStats(influencerId: string): Promise<InfluencerCodeStat[]>
fetchInfluencerPayouts(influencerId: string): Promise<InfluencerPayout[]>
createInfluencer(payload: InfluencerPayload): Promise<Influencer>
updateInfluencer(id: string, patch: Partial<InfluencerPayload>): Promise<void>
deleteInfluencer(id: string): Promise<void>
countCodesForInfluencer(influencerId: string): Promise<number>
recordInfluencerPayout(payload: InfluencerPayoutPayload): Promise<void>
```

- [ ] **Step 1: Write the service**

Create `src/services/influencersService.ts`:

```ts
/**
 * influencersService.ts
 * ---------------------
 * طبقة الخدمة الخاصة بالمشاهير (جدول `influencers`) وعمولاتهم. تتولّى:
 *  - عمليات CRUD للمسؤول على المشاهير
 *  - قراءة العروض المجمّعة (`influencer_account_summary` و`influencer_code_stats`)
 *  - سجلّ الدفعات (`influencer_payouts`)
 *
 * ملاحظة: مبلغ العمولة لا يُخزَّن في أي مكان — تحسبه العروض من
 * (subtotal - discount_amount) × النسبة المُلتقطة على الطلب. ونسبة العمولة على
 * الطلب يكتبها trigger في قاعدة البيانات، لا العميل.
 */
import { supabase } from "@/lib/supabase";

export interface Influencer {
  id: string;
  name: string;
  phone: string | null;
  instagram_handle: string | null;
  notes: string | null;
  default_commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InfluencerPayload {
  name: string;
  phone: string | null;
  instagram_handle: string | null;
  notes: string | null;
  default_commission_rate: number;
  is_active: boolean;
}

/** صف واحد لكل مشهور من العرض `influencer_account_summary`. */
export interface InfluencerAccountSummary {
  influencer_id: string;
  name: string;
  is_active: boolean;
  codes_count: number;
  orders_count: number;
  gross_sales: number;
  commission_earned: number;
  total_paid: number;
  balance_due: number;
}

/**
 * صف لكل (كود، نسبة عمولة) من العرض `influencer_code_stats`.
 * تغيير نسبة الكود أثناء الحملة يُنتج صفّين لنفس الكود، لكل واحد مجموعه.
 */
export interface InfluencerCodeStat {
  influencer_id: string;
  code: string;
  commission_rate: number;
  orders_count: number;
  gross_sales: number;
  commission_due: number;
}

export interface InfluencerPayout {
  id: string;
  influencer_id: string;
  amount: number;
  paid_at: string;
  method: string | null;
  note: string | null;
  created_at: string;
}

export interface InfluencerPayoutPayload {
  influencer_id: string;
  amount: number;
  method: string | null;
  note: string | null;
}

// تعود أعمدة DECIMAL أحيانًا كنصوص حسب المشغّل؛ نطبّعها إلى أرقام قبل الاستخدام.
function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function hydrateInfluencer(row: Record<string, unknown>): Influencer {
  return {
    ...(row as unknown as Influencer),
    default_commission_rate: num(row.default_commission_rate),
  };
}

function hydrateSummary(
  row: Record<string, unknown>
): InfluencerAccountSummary {
  return {
    ...(row as unknown as InfluencerAccountSummary),
    codes_count: num(row.codes_count),
    orders_count: num(row.orders_count),
    gross_sales: num(row.gross_sales),
    commission_earned: num(row.commission_earned),
    total_paid: num(row.total_paid),
    balance_due: num(row.balance_due),
  };
}

function hydrateCodeStat(row: Record<string, unknown>): InfluencerCodeStat {
  return {
    ...(row as unknown as InfluencerCodeStat),
    commission_rate: num(row.commission_rate),
    orders_count: num(row.orders_count),
    gross_sales: num(row.gross_sales),
    commission_due: num(row.commission_due),
  };
}

function hydratePayout(row: Record<string, unknown>): InfluencerPayout {
  return {
    ...(row as unknown as InfluencerPayout),
    amount: num(row.amount),
  };
}

/** جميع المشاهير مرتّبين بالاسم. يُرجع [] عند الفشل بدل الرمي. */
export async function fetchInfluencers(): Promise<Influencer[]> {
  const { data, error } = await supabase
    .from("influencers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching influencers:", error);
    return [];
  }
  return (data || []).map(hydrateInfluencer);
}

/** السطر النهائي لكل مشهور: طلبات، مبيعات، عمولة، مدفوع، متبقٍ. */
export async function fetchInfluencerSummaries(): Promise<
  InfluencerAccountSummary[]
> {
  const { data, error } = await supabase
    .from("influencer_account_summary")
    .select("*")
    .order("balance_due", { ascending: false });

  if (error) {
    console.error("Error fetching influencer summaries:", error);
    return [];
  }
  return (data || []).map(hydrateSummary);
}

/** تفصيل الأكواد لمشهور واحد. */
export async function fetchInfluencerCodeStats(
  influencerId: string
): Promise<InfluencerCodeStat[]> {
  const { data, error } = await supabase
    .from("influencer_code_stats")
    .select("*")
    .eq("influencer_id", influencerId)
    .order("commission_due", { ascending: false });

  if (error) {
    console.error("Error fetching influencer code stats:", error);
    return [];
  }
  return (data || []).map(hydrateCodeStat);
}

/** سجلّ دفعات مشهور واحد، الأحدث أولًا. */
export async function fetchInfluencerPayouts(
  influencerId: string
): Promise<InfluencerPayout[]> {
  const { data, error } = await supabase
    .from("influencer_payouts")
    .select("*")
    .eq("influencer_id", influencerId)
    .order("paid_at", { ascending: false });

  if (error) {
    console.error("Error fetching influencer payouts:", error);
    return [];
  }
  return (data || []).map(hydratePayout);
}

/** إنشاء مشهور جديد. يرمي عند فشل قاعدة البيانات. */
export async function createInfluencer(
  payload: InfluencerPayload
): Promise<Influencer> {
  const { data, error } = await supabase
    .from("influencers")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return hydrateInfluencer(data);
}

/** تحديث جزئي لمشهور. */
export async function updateInfluencer(
  id: string,
  patch: Partial<InfluencerPayload>
): Promise<void> {
  const { error } = await supabase
    .from("influencers")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

/**
 * حذف مشهور. أكواده تصير influencer_id = NULL (ON DELETE SET NULL)،
 * ودفعاته تُحذف معه (ON DELETE CASCADE)، والطلبات السابقة تحتفظ
 * بلقطة النسبة المسجّلة عليها.
 */
export async function deleteInfluencer(id: string): Promise<void> {
  const { error } = await supabase.from("influencers").delete().eq("id", id);
  if (error) throw error;
}

/** عدد الأكواد المرتبطة بمشهور — يُستخدم في نص تأكيد الحذف. */
export async function countCodesForInfluencer(
  influencerId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("promo_codes")
    .select("id", { count: "exact", head: true })
    .eq("influencer_id", influencerId);

  if (error) {
    console.error("Error counting influencer codes:", error);
    return 0;
  }
  return count ?? 0;
}

/** تسجيل دفعة لمشهور. المبلغ يجب أن يكون > 0 (يفرضه قيد CHECK كذلك). */
export async function recordInfluencerPayout(
  payload: InfluencerPayoutPayload
): Promise<void> {
  const { error } = await supabase.from("influencer_payouts").insert(payload);
  if (error) throw error;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/influencersService.ts
git commit -m "feat(services): add influencersService for CRUD, summaries, and payouts"
```

---

### Task 5: Attach influencers to coupons

**Files:**
- Modify: `src/services/promoCodesService.ts` (the `PromoCode` and `PromoCodePayload` interfaces, and `hydratePromo`)
- Modify: `src/pages/admin/types.ts` (`CouponFormState`)
- Modify: `src/pages/admin/constants.ts` (`initialCouponForm`)
- Modify: `src/pages/admin/hooks/useCoupons.ts`
- Modify: `src/pages/admin/dialogs/CouponFormDialog.tsx`

**Interfaces:**
- Consumes: `fetchInfluencers`, `Influencer` from Task 4; `admin.coupons.influencer*` and `admin.coupons.commissionRate` keys from Task 3.
- Produces: `PromoCode.influencer_id: string | null`, `PromoCode.commission_rate: number | null`, and the same two fields on `PromoCodePayload`. `useCoupons` additionally returns `influencers: Influencer[]`.

- [ ] **Step 1: Extend the promo code types**

In `src/services/promoCodesService.ts`, add two fields to the end of the `PromoCode` interface (currently ends with `updated_at: string;`):

```ts
export interface PromoCode {
  // ... existing fields unchanged ...
  created_at: string;
  updated_at: string;
  /** المشهور المرتبط بهذا الكود، أو null للكود العادي. */
  influencer_id: string | null;
  /** نسبة عمولة المشهور لهذا الكود تحديدًا. null للكود العادي. */
  commission_rate: number | null;
}
```

And the same two to `PromoCodePayload` (currently ends with `usage_limit_per_user: number | null;`):

```ts
export interface PromoCodePayload {
  // ... existing fields unchanged ...
  usage_limit_per_user: number | null;
  influencer_id: string | null;
  commission_rate: number | null;
}
```

- [ ] **Step 2: Hydrate the new numeric field**

In `hydratePromo` in the same file, add `commission_rate` alongside the existing `max_discount` conversion:

```ts
    commission_rate:
      row.commission_rate !== null && row.commission_rate !== undefined
        ? Number(row.commission_rate)
        : null,
```

- [ ] **Step 3: Extend the coupon form state**

In `src/pages/admin/types.ts`, add two fields to `CouponFormState`:

```ts
export interface CouponFormState {
  // ... existing fields unchanged ...
  usage_limit: string;
  usage_limit_per_user: string;
  /** "" يعني بدون مشهور. */
  influencer_id: string;
  /** يُقرأ فقط عند اختيار مشهور. */
  commission_rate: string;
}
```

In `src/pages/admin/constants.ts`, add the matching defaults to `initialCouponForm`:

```ts
  usage_limit: "",
  usage_limit_per_user: "",
  influencer_id: "",
  commission_rate: "",
```

- [ ] **Step 4: Load influencers and wire the fields in useCoupons**

In `src/pages/admin/hooks/useCoupons.ts`:

Add the imports:

```ts
import { fetchInfluencers, type Influencer } from "@/services/influencersService";
import { useEffect } from "react";
```

(Adjust the existing `import { useMemo, useState } from "react";` to `import { useEffect, useMemo, useState } from "react";` rather than adding a second React import.)

Add state and a loader near the other `useState` calls:

```ts
  const [influencers, setInfluencers] = useState<Influencer[]>([]);

  // قائمة المشاهير لمُنتقي النموذج. تُحمَّل مرة واحدة عند تركيب الـ hook.
  useEffect(() => {
    fetchInfluencers().then(setInfluencers);
  }, []);
```

In `openCreateCoupon`, nothing changes — `initialCouponForm` already carries the empty values.

In `openEditCoupon`, add the two fields to the `setCouponForm({...})` object:

```ts
      influencer_id: coupon.influencer_id ?? "",
      commission_rate:
        coupon.commission_rate !== null ? String(coupon.commission_rate) : "",
```

In `buildCouponPayload`, add validation just before the `return {` statement:

```ts
    // العمولة تُقرأ فقط عند ربط مشهور؛ الكود بلا مشهور يُخزَّن بـ null.
    const influencerId = couponForm.influencer_id || null;
    let commissionRate: number | null = null;
    if (influencerId) {
      const rate = Number(couponForm.commission_rate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        setCouponFormError(t("admin.influencers.validation.rateRange"));
        return null;
      }
      commissionRate = rate;
    }
```

And add them to the returned payload object:

```ts
      usage_limit: usageLimit,
      usage_limit_per_user: perUserLimit,
      influencer_id: influencerId,
      commission_rate: commissionRate,
    };
```

Finally add `influencers` to the hook's return object, next to `filteredPickerProducts`:

```ts
    filteredPickerProducts,
    influencers,
```

- [ ] **Step 5: Add the form fields to the dialog**

In `src/pages/admin/dialogs/CouponFormDialog.tsx`, add `influencers` to the destructured `couponsApi`:

```ts
    filteredPickerProducts,
    influencers,
    handleCouponSubmit,
```

Then insert this block inside the `<div className="space-y-4">`, directly after the coupon-code field's closing `</div>` (i.e. before the `discountType` grid):

```tsx
          {/* ربط الكود بمشهور: عند الاختيار تظهر نسبة العمولة وتُعبَّأ من
              النسبة الافتراضية للمشهور، وتبقى قابلة للتعديل لهذا الكود. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#323D50] dark:text-white/80">
                {t("admin.coupons.influencer")}
              </Label>
              <Select
                value={couponForm.influencer_id || "none"}
                onValueChange={(v) =>
                  setCouponForm((prev) => {
                    if (v === "none") {
                      return { ...prev, influencer_id: "", commission_rate: "" };
                    }
                    const picked = influencers.find((i) => i.id === v);
                    return {
                      ...prev,
                      influencer_id: v,
                      // إبقاء النسبة الحالية إن كانت مضبوطة، وإلا الافتراضية للمشهور.
                      commission_rate:
                        prev.commission_rate ||
                        String(picked?.default_commission_rate ?? 3),
                    };
                  })
                }
              >
                <SelectTrigger className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                  <SelectItem value="none">
                    {t("admin.coupons.influencerNone")}
                  </SelectItem>
                  {influencers.map((inf) => (
                    <SelectItem key={inf.id} value={inf.id}>
                      {inf.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#6B7B8D]">
                {t("admin.coupons.influencerHint")}
              </p>
            </div>

            {couponForm.influencer_id && (
              <div className="space-y-2">
                <Label className="text-[#323D50] dark:text-white/80">
                  {t("admin.coupons.commissionRate")} *
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={couponForm.commission_rate}
                  onChange={(e) =>
                    setCouponForm((prev) => ({
                      ...prev,
                      commission_rate: e.target.value,
                    }))
                  }
                  className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white"
                />
              </div>
            )}
          </div>
```

- [ ] **Step 6: Verify build and lint**

```bash
npm run build && npm run lint
```

Expected: both pass. A TypeScript error naming `influencer_id` means a `CouponFormState` or `PromoCodePayload` field was missed.

- [ ] **Step 7: Verify a coupon round-trips through the database**

Run with `mcp__supabase__execute_sql`:

```sql
BEGIN;
INSERT INTO influencers (name, default_commission_rate) VALUES ('ROUNDTRIP', 3.00);
INSERT INTO promo_codes (code, discount_type, discount_value, min_order_total, scope, scope_product_ids, is_active, usage_limit, usage_limit_per_user, influencer_id, commission_rate)
SELECT 'RT5','percentage',5,0,'all_products','[]'::jsonb,true,NULL,NULL,id,3.00
FROM influencers WHERE name='ROUNDTRIP';
SELECT code, discount_value, commission_rate, influencer_id IS NOT NULL AS linked
FROM promo_codes WHERE code='RT5';
ROLLBACK;
```

Expected: `code=RT5`, `discount_value=5`, `commission_rate=3.00`, `linked=true`.

- [ ] **Step 8: Commit**

```bash
git add src/services/promoCodesService.ts src/pages/admin/types.ts src/pages/admin/constants.ts src/pages/admin/hooks/useCoupons.ts src/pages/admin/dialogs/CouponFormDialog.tsx
git commit -m "feat(admin): assign an influencer and commission rate to a coupon

The rate field appears only once an influencer is selected and seeds from
that influencer's default. Codes with no influencer store null for both."
```

---

### Task 6: useInfluencers hook

**Files:**
- Create: `src/pages/admin/hooks/useInfluencers.ts`

**Interfaces:**
- Consumes: all of `influencersService` (Task 4); `admin.influencers.*` keys (Task 3); `useConfirmDialog` from `./useConfirmDialog`.
- Produces: the `useInfluencers()` hook. Tasks 7 and 8 consume its return value as a single `influencersApi` prop.

Return shape:
```ts
{
  summaries: InfluencerAccountSummary[]; summariesLoading: boolean;
  isFormDialogOpen: boolean; setIsFormDialogOpen: (v: boolean) => void;
  editingInfluencer: Influencer | null; setEditingInfluencer: (v: Influencer | null) => void;
  form: InfluencerFormState; setForm: Dispatch<SetStateAction<InfluencerFormState>>;
  formError: string | null; setFormError: (v: string | null) => void;
  submitLoading: boolean; deletingId: string | null;
  isStatementOpen: boolean; setIsStatementOpen: (v: boolean) => void;
  statementInfluencer: InfluencerAccountSummary | null;
  codeStats: InfluencerCodeStat[]; payouts: InfluencerPayout[]; statementLoading: boolean;
  payoutForm: PayoutFormState; setPayoutForm: Dispatch<SetStateAction<PayoutFormState>>;
  payoutError: string | null; payoutSubmitLoading: boolean;
  totalCommission: number; totalBalance: number;
  loadSummaries: () => Promise<void>;
  openCreate: () => void; openEdit: (id: string) => Promise<void>;
  handleSubmit: () => Promise<void>; handleDelete: (id: string) => Promise<void>;
  openStatement: (row: InfluencerAccountSummary) => Promise<void>;
  handleRecordPayout: () => Promise<void>;
  confirmDialogProps: ReturnType<typeof useConfirmDialog>["confirmDialogProps"];
}
```

- [ ] **Step 1: Write the hook**

Create `src/pages/admin/hooks/useInfluencers.ts`:

```ts
/**
 * useInfluencers.ts
 *
 * hook للبيانات والتعديلات الخاص بمورد "المشاهير" في لوحة الإدارة.
 * يملك قائمة الملخّصات (من العرض المجمَّع)، وحالة نموذج الإنشاء/التعديل،
 * وحالة نافذة قائمة الحساب (تفصيل الأكواد + سجلّ الدفعات + تسجيل دفعة).
 * تُفوَّض جميع عمليات Supabase إلى `influencersService`.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  fetchInfluencers,
  fetchInfluencerSummaries,
  fetchInfluencerCodeStats,
  fetchInfluencerPayouts,
  createInfluencer,
  updateInfluencer,
  deleteInfluencer,
  countCodesForInfluencer,
  recordInfluencerPayout,
  type Influencer,
  type InfluencerAccountSummary,
  type InfluencerCodeStat,
  type InfluencerPayout,
} from "@/services/influencersService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useConfirmDialog } from "./useConfirmDialog";

/** حالة نموذج المشهور. الحقول الرقمية نصوص لأنها مرتبطة بمدخلات نصّية. */
export interface InfluencerFormState {
  name: string;
  phone: string;
  instagram_handle: string;
  notes: string;
  default_commission_rate: string;
  is_active: boolean;
}

/** حالة نموذج تسجيل الدفعة. */
export interface PayoutFormState {
  amount: string;
  method: string;
  note: string;
}

const initialForm: InfluencerFormState = {
  name: "",
  phone: "",
  instagram_handle: "",
  notes: "",
  default_commission_rate: "3",
  is_active: true,
};

const initialPayoutForm: PayoutFormState = {
  amount: "",
  method: "cash",
  note: "",
};

export function useInfluencers() {
  const { t } = useLanguage();
  const { confirm, confirmDialogProps } = useConfirmDialog();

  const [summaries, setSummaries] = useState<InfluencerAccountSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(
    null
  );
  const [form, setForm] = useState<InfluencerFormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [statementInfluencer, setStatementInfluencer] =
    useState<InfluencerAccountSummary | null>(null);
  const [codeStats, setCodeStats] = useState<InfluencerCodeStat[]>([]);
  const [payouts, setPayouts] = useState<InfluencerPayout[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);

  const [payoutForm, setPayoutForm] =
    useState<PayoutFormState>(initialPayoutForm);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSubmitLoading, setPayoutSubmitLoading] = useState(false);

  // جلب ملخّصات كل المشاهير من العرض المجمَّع.
  const loadSummaries = async () => {
    setSummariesLoading(true);
    try {
      const data = await fetchInfluencerSummaries();
      setSummaries(data);
    } catch {
      toast.error(t("admin.influencers.toast.loadFailed"));
    } finally {
      setSummariesLoading(false);
    }
  };

  // فتح النموذج في وضع "الإنشاء".
  const openCreate = () => {
    setEditingInfluencer(null);
    setForm(initialForm);
    setFormError(null);
    setIsFormDialogOpen(true);
  };

  // فتح النموذج في وضع "التعديل". الملخّص لا يحمل كل الحقول، فنجلب الصف الكامل.
  const openEdit = async (id: string) => {
    const all = await fetchInfluencers();
    const found = all.find((i) => i.id === id);
    if (!found) {
      toast.error(t("admin.influencers.toast.loadFailed"));
      return;
    }
    setEditingInfluencer(found);
    setForm({
      name: found.name,
      phone: found.phone ?? "",
      instagram_handle: found.instagram_handle ?? "",
      notes: found.notes ?? "",
      default_commission_rate: String(found.default_commission_rate),
      is_active: found.is_active,
    });
    setFormError(null);
    setIsFormDialogOpen(true);
  };

  // إنشاء أو تحديث حسب وضع التعديل، ثم الإغلاق وإعادة الجلب.
  const handleSubmit = async () => {
    const name = form.name.trim();
    if (!name) {
      setFormError(t("admin.influencers.validation.nameRequired"));
      return;
    }
    const rate = Number(form.default_commission_rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setFormError(t("admin.influencers.validation.rateRange"));
      return;
    }

    const payload = {
      name,
      phone: form.phone.trim() || null,
      instagram_handle: form.instagram_handle.trim() || null,
      notes: form.notes.trim() || null,
      default_commission_rate: rate,
      is_active: form.is_active,
    };

    setSubmitLoading(true);
    try {
      if (editingInfluencer) {
        await updateInfluencer(editingInfluencer.id, payload);
        toast.success(t("admin.influencers.toast.updated"));
      } else {
        await createInfluencer(payload);
        toast.success(t("admin.influencers.toast.created"));
      }
      setIsFormDialogOpen(false);
      setEditingInfluencer(null);
      setForm(initialForm);
      setFormError(null);
      await loadSummaries();
    } catch (err) {
      console.error("Error saving influencer:", err);
      toast.error(t("admin.influencers.toast.saveFailed"));
    } finally {
      setSubmitLoading(false);
    }
  };

  // حذف مشهور بعد تأكيد يذكر عدد أكواده التي ستُفَك.
  const handleDelete = async (id: string) => {
    const codeCount = await countCodesForInfluencer(id);
    const description =
      codeCount > 0
        ? t("admin.influencers.confirm.deleteWithCodes").replace(
            "{count}",
            String(codeCount)
          )
        : t("admin.influencers.confirm.delete");

    const confirmed = await confirm({
      title: t("admin.influencers.edit"),
      description,
      confirmLabel: t("admin.confirmDialog.delete"),
      variant: "danger",
    });
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await deleteInfluencer(id);
      toast.success(t("admin.influencers.toast.deleted"));
      await loadSummaries();
    } catch {
      toast.error(t("admin.influencers.toast.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  // فتح قائمة الحساب: تفصيل الأكواد + سجلّ الدفعات، مع تعبئة مبلغ الدفعة
  // المقترح بالرصيد المتبقي (ويبقى قابلًا للتعديل).
  const openStatement = async (row: InfluencerAccountSummary) => {
    setStatementInfluencer(row);
    setIsStatementOpen(true);
    setPayoutForm({
      ...initialPayoutForm,
      amount: row.balance_due > 0 ? String(row.balance_due) : "",
    });
    setPayoutError(null);
    setStatementLoading(true);
    try {
      const [stats, history] = await Promise.all([
        fetchInfluencerCodeStats(row.influencer_id),
        fetchInfluencerPayouts(row.influencer_id),
      ]);
      setCodeStats(stats);
      setPayouts(history);
    } catch {
      toast.error(t("admin.influencers.toast.loadFailed"));
    } finally {
      setStatementLoading(false);
    }
  };

  // تسجيل دفعة. المبلغ الأكبر من الرصيد مسموح (دفعة مقدّمة) — التحذير في الواجهة.
  const handleRecordPayout = async () => {
    if (!statementInfluencer) return;
    const amount = Number(payoutForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayoutError(t("admin.influencers.validation.amountRequired"));
      return;
    }
    setPayoutSubmitLoading(true);
    try {
      await recordInfluencerPayout({
        influencer_id: statementInfluencer.influencer_id,
        amount,
        method: payoutForm.method || null,
        note: payoutForm.note.trim() || null,
      });
      toast.success(t("admin.influencers.toast.payoutRecorded"));
      setPayoutError(null);
      // إعادة جلب السجلّ والملخّصات حتى يتحدّث الرصيد المعروض فورًا.
      const [history, fresh] = await Promise.all([
        fetchInfluencerPayouts(statementInfluencer.influencer_id),
        fetchInfluencerSummaries(),
      ]);
      setPayouts(history);
      setSummaries(fresh);
      const updated = fresh.find(
        (s) => s.influencer_id === statementInfluencer.influencer_id
      );
      if (updated) setStatementInfluencer(updated);
      setPayoutForm({ ...initialPayoutForm, amount: "" });
    } catch (err) {
      console.error("Error recording payout:", err);
      toast.error(t("admin.influencers.toast.payoutFailed"));
    } finally {
      setPayoutSubmitLoading(false);
    }
  };

  // إحصاءات مشتقّة لبطاقات الأعلى.
  const totalCommission = useMemo(
    () => summaries.reduce((sum, s) => sum + s.commission_earned, 0),
    [summaries]
  );
  const totalBalance = useMemo(
    () => summaries.reduce((sum, s) => sum + s.balance_due, 0),
    [summaries]
  );

  return {
    summaries,
    summariesLoading,
    isFormDialogOpen,
    setIsFormDialogOpen,
    editingInfluencer,
    setEditingInfluencer,
    form,
    setForm,
    formError,
    setFormError,
    submitLoading,
    deletingId,
    isStatementOpen,
    setIsStatementOpen,
    statementInfluencer,
    codeStats,
    payouts,
    statementLoading,
    payoutForm,
    setPayoutForm,
    payoutError,
    payoutSubmitLoading,
    totalCommission,
    totalBalance,
    loadSummaries,
    openCreate,
    openEdit,
    handleSubmit,
    handleDelete,
    openStatement,
    handleRecordPayout,
    confirmDialogProps,
  };
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/hooks/useInfluencers.ts
git commit -m "feat(admin): add useInfluencers hook for summaries, CRUD, and payouts"
```

---

### Task 7: Influencers table, page, route, and sidebar entry

**Files:**
- Create: `src/pages/admin/tabs/InfluencersTab.tsx`
- Create: `src/pages/admin/dialogs/InfluencerFormDialog.tsx`
- Create: `src/pages/admin/pages/InfluencersPage.tsx`
- Modify: `src/pages/admin/AdminApp.tsx`
- Modify: `src/pages/admin/components/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `useInfluencers` (Task 6); `admin.influencers.*` and `admin.nav.influencers` keys (Task 3).
- Produces: the `/admin/influencers` route. Task 8 mounts its statement dialog inside `InfluencersPage`.

- [ ] **Step 1: Write the table**

Create `src/pages/admin/tabs/InfluencersTab.tsx`:

```tsx
/**
 * ملف: InfluencersTab.tsx
 * الدور: جدول المشاهير في لوحة التحكم. صف لكل مشهور مع أرقامه المجمَّعة
 * (أكواد، طلبات، مبيعات، عمولة، مدفوع، متبقٍ) وأزرار الحساب/التعديل/الحذف.
 * مكوّن عرض محض — كل الحالة تأتي من الـ hook `useInfluencers`.
 */
import { Plus, Receipt, Pencil, Trash2, Megaphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import type { useInfluencers } from "../hooks/useInfluencers";
import { StatCard } from "../components/StatCard";
import { TableSkeleton } from "../components/TableSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";

interface InfluencersTabProps {
  influencersApi: ReturnType<typeof useInfluencers>;
}

export function InfluencersTab({ influencersApi }: InfluencersTabProps) {
  const { t } = useLanguage();
  const {
    summaries,
    summariesLoading,
    totalCommission,
    totalBalance,
    deletingId,
    openCreate,
    openEdit,
    handleDelete,
    openStatement,
    confirmDialogProps,
  } = influencersApi;

  // تنسيق موحّد للمبالغ بالدينار الليبي بمنزلتين عشريتين.
  const money = (n: number) => n.toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold gradient-text">
            {t("admin.influencers.title")}
          </h1>
          <p className="text-sm text-[#6B7B8D]">
            {t("admin.influencers.subtitle")}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4 me-1.5" />
          {t("admin.influencers.create")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title={t("admin.influencers.commissionEarned")}
          value={money(totalCommission)}
          icon={Receipt}
        />
        <StatCard
          title={t("admin.influencers.balanceDue")}
          value={money(totalBalance)}
          icon={Wallet}
        />
      </div>

      {summariesLoading ? (
        <TableSkeleton columns={8} />
      ) : summaries.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={t("admin.influencers.empty")}
          subtitle={t("admin.influencers.emptyHint")}
          action={{
            label: t("admin.influencers.create"),
            onClick: openCreate,
          }}
        />
      ) : (
        <div className="glass-card p-0 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#6B7B8D] border-b border-[#323D50]/10 dark:border-white/10">
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.name")}
                </th>
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.codesCount")}
                </th>
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.ordersCount")}
                </th>
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.grossSales")}
                </th>
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.commissionEarned")}
                </th>
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.totalPaid")}
                </th>
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.balanceDue")}
                </th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {summaries.map((row) => (
                <tr
                  key={row.influencer_id}
                  className="border-b border-[#323D50]/5 dark:border-white/5 text-[#323D50] dark:text-[#F5F5F5]"
                >
                  <td className="p-3 font-medium">
                    <span className="flex items-center gap-2">
                      {row.name}
                      {!row.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          {t("admin.influencers.active")}: —
                        </Badge>
                      )}
                    </span>
                  </td>
                  <td className="p-3">{row.codes_count}</td>
                  <td className="p-3">{row.orders_count}</td>
                  <td className="p-3">{money(row.gross_sales)}</td>
                  <td className="p-3">{money(row.commission_earned)}</td>
                  <td className="p-3">{money(row.total_paid)}</td>
                  {/* المتبقي هو الرقم الذي يهم عند الدفع، فيُبرز */}
                  <td className="p-3 font-bold text-[#5B8DD9]">
                    {money(row.balance_due)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openStatement(row)}
                        className="rounded-lg cursor-pointer"
                      >
                        <Receipt className="w-4 h-4 me-1" />
                        {t("admin.influencers.viewStatement")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(row.influencer_id)}
                        className="rounded-lg cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === row.influencer_id}
                        onClick={() => handleDelete(row.influencer_id)}
                        className="rounded-lg text-red-500 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* نافذة التأكيد تُركَّب داخل الـ tab، مطابقةً لنمط CouponsTab.tsx:322 */}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
```

Verified against the actual shared components: `StatCard({ title, value, icon, iconColor?, trend? })`, `EmptyState({ icon, title, subtitle?, action? })` — `icon` is required and the text prop is `subtitle`, not `description` — and `TableSkeleton({ columns?, rows? })`. All three are named exports.

- [ ] **Step 2: Write the influencer form dialog**

Create `src/pages/admin/dialogs/InfluencerFormDialog.tsx`:

```tsx
/**
 * InfluencerFormDialog.tsx
 * ------------------------
 * نموذج نافذة لإنشاء أو تعديل مشهور. كل الحالة تأتي من الـ hook
 * `useInfluencers` (يُمرَّر باسم `influencersApi`) — مكوّن عرض محض.
 * النسبة هنا هي الافتراضية التي تُعبّئ نموذج الكوبون؛ النسبة الفعلية
 * تُضبط على مستوى كل كود.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { useInfluencers } from "../hooks/useInfluencers";

interface InfluencerFormDialogProps {
  influencersApi: ReturnType<typeof useInfluencers>;
}

export function InfluencerFormDialog({
  influencersApi,
}: InfluencerFormDialogProps) {
  const { t } = useLanguage();
  const {
    isFormDialogOpen,
    setIsFormDialogOpen,
    editingInfluencer,
    setEditingInfluencer,
    form,
    setForm,
    formError,
    setFormError,
    submitLoading,
    handleSubmit,
  } = influencersApi;

  return (
    <Dialog
      open={isFormDialogOpen}
      onOpenChange={(open) => {
        setIsFormDialogOpen(open);
        if (!open) {
          setEditingInfluencer(null);
          setFormError(null);
        }
      }}
    >
      <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {editingInfluencer
              ? t("admin.influencers.edit")
              : t("admin.influencers.create")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("admin.influencers.name")} *</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("admin.influencers.namePlaceholder")}
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("admin.influencers.phone")}</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.influencers.instagram")}</Label>
              <Input
                value={form.instagram_handle}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    instagram_handle: e.target.value,
                  }))
                }
                placeholder={t("admin.influencers.instagramPlaceholder")}
                className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("admin.influencers.defaultRate")}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={form.default_commission_rate}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  default_commission_rate: e.target.value,
                }))
              }
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("admin.influencers.notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) =>
                setForm((prev) => ({ ...prev, is_active: v }))
              }
            />
            <Label>{t("admin.influencers.active")}</Label>
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <LoadingButton
            loading={submitLoading}
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl"
          >
            {editingInfluencer
              ? t("admin.influencers.edit")
              : t("admin.influencers.create")}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Write the page**

Create `src/pages/admin/pages/InfluencersPage.tsx`:

```tsx
/**
 * ملف: InfluencersPage.tsx
 * الدور: صفحة هدف المسار الخاصة بالمشاهير (/admin/influencers).
 * غلاف رفيع يربط الـ hook بجدول العرض ونوافذه، بلا منطق عرض مباشر.
 */
import { useEffect } from "react";
import { useInfluencers } from "../hooks/useInfluencers";
import { InfluencersTab } from "../tabs/InfluencersTab";
import { InfluencerFormDialog } from "../dialogs/InfluencerFormDialog";

export default function InfluencersPage() {
  const influencersApi = useInfluencers();

  // تحميل الملخّصات مرة واحدة عند أول تركيب للصفحة
  useEffect(() => {
    influencersApi.loadSummaries();
  }, []);

  return (
    <>
      <InfluencersTab influencersApi={influencersApi} />
      <InfluencerFormDialog influencersApi={influencersApi} />
    </>
  );
}
```

`ConfirmDialog` is deliberately absent here — `CouponsTab.tsx:322` mounts it inside the tab, and `InfluencersTab` follows that convention.

- [ ] **Step 4: Register the route**

In `src/pages/admin/AdminApp.tsx`, add the import next to the others:

```tsx
import InfluencersPage from "./pages/InfluencersPage";
```

and the route after the coupons route:

```tsx
                <Route path="coupons" element={<CouponsPage />} />
                <Route path="influencers" element={<InfluencersPage />} />
```

- [ ] **Step 5: Add the sidebar entry**

In `src/pages/admin/components/AdminSidebar.tsx`:

Add `Megaphone` to the `lucide-react` import list.

Add to `navItems`, after the coupons entry:

```tsx
  { path: "/influencers", icon: Megaphone, labelKey: "admin.nav.influencers" },
```

Add to `FALLBACK_LABELS`:

```tsx
  "admin.nav.influencers": "Influencers",
```

- [ ] **Step 6: Verify build and lint**

```bash
npm run build && npm run lint
```

Expected: both pass.

- [ ] **Step 7: Verify the page renders**

```bash
npm run dev
```

Open `http://localhost:5173/admin/influencers`, log in, and confirm: the sidebar shows an Influencers entry, the page shows the empty state, and "Add Influencer" opens the dialog. Create one influencer and confirm it appears as a row with all-zero figures. Switch the language to Arabic and confirm no raw translation keys are visible and the table reads right-to-left.

- [ ] **Step 8: Commit**

```bash
git add src/pages/admin/tabs/InfluencersTab.tsx src/pages/admin/dialogs/InfluencerFormDialog.tsx src/pages/admin/pages/InfluencersPage.tsx src/pages/admin/AdminApp.tsx src/pages/admin/components/AdminSidebar.tsx
git commit -m "feat(admin): add influencers section with commission summary table"
```

---

### Task 8: Statement dialog and payout recording

**Files:**
- Create: `src/pages/admin/dialogs/InfluencerStatementDialog.tsx`
- Modify: `src/pages/admin/pages/InfluencersPage.tsx`

**Interfaces:**
- Consumes: `useInfluencers` statement state and `handleRecordPayout` (Task 6); `admin.influencers.*` keys (Task 3).
- Produces: nothing consumed downstream.

- [ ] **Step 1: Write the statement dialog**

Create `src/pages/admin/dialogs/InfluencerStatementDialog.tsx`:

```tsx
/**
 * InfluencerStatementDialog.tsx
 * -----------------------------
 * قائمة حساب مشهور واحد: تفصيل الأكواد (طلبات/مبيعات/عمولة لكل كود)
 * وسجلّ الدفعات مع نموذج تسجيل دفعة جديدة.
 * مكوّن عرض محض — كل الحالة من الـ hook `useInfluencers`.
 *
 * ملاحظة: قد يظهر الكود الواحد في صفّين إذا عُدِّلت نسبة عمولته أثناء
 * الحملة — صف لكل نسبة، بمجموعه الصحيح.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { useInfluencers } from "../hooks/useInfluencers";

interface InfluencerStatementDialogProps {
  influencersApi: ReturnType<typeof useInfluencers>;
}

export function InfluencerStatementDialog({
  influencersApi,
}: InfluencerStatementDialogProps) {
  const { t } = useLanguage();
  const {
    isStatementOpen,
    setIsStatementOpen,
    statementInfluencer,
    codeStats,
    payouts,
    statementLoading,
    payoutForm,
    setPayoutForm,
    payoutError,
    payoutSubmitLoading,
    handleRecordPayout,
  } = influencersApi;

  const money = (n: number) => n.toFixed(2);

  // دفعة أكبر من الرصيد مسموحة (مقدّمة) لكن تستحق تحذيرًا واضحًا.
  const enteredAmount = Number(payoutForm.amount);
  const isOverpay =
    !!statementInfluencer &&
    Number.isFinite(enteredAmount) &&
    enteredAmount > statementInfluencer.balance_due;

  return (
    <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
      <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {t("admin.influencers.statementTitle")}
            {statementInfluencer ? ` — ${statementInfluencer.name}` : ""}
          </DialogTitle>
        </DialogHeader>

        {statementLoading ? (
          <p className="text-sm text-[#6B7B8D] py-6">…</p>
        ) : (
          <div className="space-y-6">
            {/* ملخّص الأرقام الثلاثة التي تهم عند الدفع */}
            {statementInfluencer && (
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-xs text-[#6B7B8D]">
                    {t("admin.influencers.commissionEarned")}
                  </p>
                  <p className="font-bold">
                    {money(statementInfluencer.commission_earned)}
                  </p>
                </div>
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-xs text-[#6B7B8D]">
                    {t("admin.influencers.totalPaid")}
                  </p>
                  <p className="font-bold">
                    {money(statementInfluencer.total_paid)}
                  </p>
                </div>
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-xs text-[#6B7B8D]">
                    {t("admin.influencers.balanceDue")}
                  </p>
                  <p className="font-bold text-[#5B8DD9]">
                    {money(statementInfluencer.balance_due)}
                  </p>
                </div>
              </div>
            )}

            {/* الجزء الأول: تفصيل الأكواد */}
            <div className="space-y-2">
              <h3 className="font-semibold">
                {t("admin.influencers.codeBreakdown")}
              </h3>
              {codeStats.length === 0 ? (
                <div className="glass-card p-4 rounded-xl">
                  <p className="text-sm">{t("admin.influencers.noOrders")}</p>
                  <p className="text-xs text-[#6B7B8D]">
                    {t("admin.influencers.noOrdersHint")}
                  </p>
                </div>
              ) : (
                <div className="glass-card p-0 rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#6B7B8D] border-b border-[#323D50]/10 dark:border-white/10">
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.code")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.commissionRate")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.ordersCount")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.grossSales")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.commissionDue")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {codeStats.map((row) => (
                        <tr
                          key={`${row.code}-${row.commission_rate}`}
                          className="border-b border-[#323D50]/5 dark:border-white/5"
                        >
                          <td className="p-3 font-mono">{row.code}</td>
                          <td className="p-3">{row.commission_rate}%</td>
                          <td className="p-3">{row.orders_count}</td>
                          <td className="p-3">{money(row.gross_sales)}</td>
                          <td className="p-3 font-semibold">
                            {money(row.commission_due)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* الجزء الثاني: سجلّ الدفعات + تسجيل دفعة */}
            <div className="space-y-2">
              <h3 className="font-semibold">
                {t("admin.influencers.payouts")}
              </h3>
              {payouts.length === 0 ? (
                <p className="text-sm text-[#6B7B8D]">
                  {t("admin.influencers.noPayouts")}
                </p>
              ) : (
                <div className="glass-card p-0 rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#6B7B8D] border-b border-[#323D50]/10 dark:border-white/10">
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.payoutDate")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.payoutAmount")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.payoutMethod")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.payoutNote")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-[#323D50]/5 dark:border-white/5"
                        >
                          <td className="p-3">{p.paid_at.slice(0, 10)}</td>
                          <td className="p-3 font-semibold">
                            {money(p.amount)}
                          </td>
                          <td className="p-3">{p.method ?? "—"}</td>
                          <td className="p-3">{p.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="glass-card p-4 rounded-xl space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>{t("admin.influencers.payoutAmount")} *</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={payoutForm.amount}
                      onChange={(e) =>
                        setPayoutForm((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.influencers.payoutMethod")}</Label>
                    <Select
                      value={payoutForm.method}
                      onValueChange={(v) =>
                        setPayoutForm((prev) => ({ ...prev, method: v }))
                      }
                    >
                      <SelectTrigger className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                        <SelectItem value="cash">
                          {t("admin.influencers.payoutMethodCash")}
                        </SelectItem>
                        <SelectItem value="transfer">
                          {t("admin.influencers.payoutMethodTransfer")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.influencers.payoutNote")}</Label>
                    <Input
                      value={payoutForm.note}
                      onChange={(e) =>
                        setPayoutForm((prev) => ({
                          ...prev,
                          note: e.target.value,
                        }))
                      }
                      className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
                    />
                  </div>
                </div>

                {isOverpay && (
                  <p className="text-sm text-amber-500">
                    {t("admin.influencers.overpayWarning")}
                  </p>
                )}
                {payoutError && (
                  <p className="text-sm text-red-500">{payoutError}</p>
                )}

                <LoadingButton
                  loading={payoutSubmitLoading}
                  onClick={handleRecordPayout}
                  className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl"
                >
                  {t("admin.influencers.recordPayout")}
                </LoadingButton>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Mount it on the page**

In `src/pages/admin/pages/InfluencersPage.tsx`, add the import:

```tsx
import { InfluencerStatementDialog } from "../dialogs/InfluencerStatementDialog";
```

and render it after `InfluencerFormDialog`:

```tsx
      <InfluencerStatementDialog influencersApi={influencersApi} />
```

- [ ] **Step 3: Verify build and lint**

```bash
npm run build && npm run lint
```

Expected: both pass.

- [ ] **Step 4: Verify the full flow end to end**

Run `npm run dev` and, in `/admin`:

1. Create an influencer with a 3% default rate.
2. In Coupons, create a code with `percentage` / `5`, assign it to that influencer, and confirm the commission field pre-fills with `3`.
3. Insert a qualifying order for that code using `mcp__supabase__execute_sql` (note: this is real data, so delete it afterwards):

```sql
INSERT INTO orders (first_name,last_name,email,phone,city,subtotal,discount_amount,delivery_fee,total,status,items,promo_code_id,promo_code_snapshot)
SELECT 'Manual','Check','manualcheck@example.com','0','Tripoli',1000,50,30,980,'delivered','[]'::jsonb,id,code
FROM promo_codes WHERE code = '<YOUR_CODE>';
```

4. Reload `/admin/influencers`. Expect: orders 1, sales 950.00, commission 28.50, paid 0.00, balance 28.50.
5. Open the statement. Expect one code row at 3%, 1 order, 950.00, 28.50.
6. Record a 28.50 cash payment. Expect a success toast, the payout appearing in the history, and the balance dropping to 0.00.
7. Enter an amount above the balance and confirm the overpay warning appears without blocking the button.
8. Switch to Arabic and confirm no raw keys and correct RTL layout.
9. Clean up:

```sql
DELETE FROM orders WHERE email = 'manualcheck@example.com';
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/dialogs/InfluencerStatementDialog.tsx src/pages/admin/pages/InfluencersPage.tsx
git commit -m "feat(admin): influencer statement dialog with per-code breakdown and payouts"
```

---

### Task 9: Playwright coverage

**Files:**
- Create: `tests/e2e/admin-influencers.spec.ts`

**Interfaces:**
- Consumes: the `/admin/influencers` route (Task 7) and the statement dialog (Task 8).
- Produces: nothing.

The admin panel is behind a login dialog and the repo has no admin test credentials committed. The spec therefore skips itself unless `ADMIN_TEST_USERNAME` and `ADMIN_TEST_PASSWORD` are set in the environment. This is deliberate: a spec that silently passes because it never ran is worse than one that reports skipped.

- [ ] **Step 1: Write the spec**

Create `tests/e2e/admin-influencers.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const USERNAME = process.env.ADMIN_TEST_USERNAME;
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;

// تُتخطّى المجموعة كاملة بلا بيانات دخول، حتى لا تمر بصمت دون تشغيل فعلي.
test.describe("admin influencers", () => {
  test.skip(
    !USERNAME || !PASSWORD,
    "set ADMIN_TEST_USERNAME and ADMIN_TEST_PASSWORD to run admin e2e tests"
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/influencers");
    await page.getByLabel(/username/i).fill(USERNAME!);
    await page.getByLabel(/password/i).fill(PASSWORD!);
    await page.getByRole("button", { name: /login|sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/);
  });

  test("influencers page loads with its summary table", async ({ page }) => {
    await page.goto("/admin/influencers");
    // إمّا الجدول أو حالة الفراغ — كلاهما تحميل ناجح.
    await expect(
      page.getByRole("heading", { name: /influencers|المشاهير/i })
    ).toBeVisible();
  });

  test("creating an influencer adds a row", async ({ page }) => {
    await page.goto("/admin/influencers");
    const name = `E2E Influencer ${Date.now()}`;

    await page.getByRole("button", { name: /add influencer|إضافة مشهور/i }).click();
    await page.getByLabel(/^name|^الاسم/i).fill(name);
    await page
      .getByRole("button", { name: /add influencer|إضافة مشهور/i })
      .last()
      .click();

    await expect(page.getByText(name)).toBeVisible();
  });

  test("statement dialog opens with zeroed totals for a fresh influencer", async ({
    page,
  }) => {
    await page.goto("/admin/influencers");
    await page.getByRole("button", { name: /statement|قائمة الحساب/i }).first().click();
    await expect(
      page.getByRole("dialog").getByText(/per-code breakdown|تفصيل الأكواد/i)
    ).toBeVisible();
  });
});
```

Before running, check the actual label text in `src/pages/admin/dialogs/LoginDialog.tsx` and adjust the two `getByLabel` selectors in `beforeEach` to match.

- [ ] **Step 2: Run the spec**

```bash
npx playwright test tests/e2e/admin-influencers.spec.ts
```

Expected without credentials: `3 skipped`. Expected with `ADMIN_TEST_USERNAME` and `ADMIN_TEST_PASSWORD` set: `3 passed`.

Report which of the two you actually observed. Do not claim the tests pass if they skipped.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/admin-influencers.spec.ts
git commit -m "test(e2e): admin influencers page, creation, and statement dialog

Skips unless ADMIN_TEST_USERNAME and ADMIN_TEST_PASSWORD are set, so a
credential-less run reports skipped rather than passing without running."
```

---

## Final verification

After Task 9, before declaring the feature done:

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Every SQL assertion in Tasks 1 and 2 produced its expected values
- [ ] The manual flow in Task 8 Step 4 was walked end to end, including the Arabic pass
- [ ] The manual test order was deleted
- [ ] An existing coupon with no influencer still applies at checkout and produces an order with `influencer_id IS NULL`
