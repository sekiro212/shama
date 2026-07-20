# Influencer Coupons & Commission Tracking — Design

Date: 2026-07-20
Status: Approved (design), pending implementation plan

## Problem

Coupons are currently anonymous discount codes. When a code is handed to a specific
influencer as part of a promotion deal, there is no way to know how many orders that
code produced or how much commission is owed. The owner calculates payouts by hand.

## Goal

Attach a coupon to an influencer, record a per-code commission rate, and aggregate
qualifying orders per code and per influencer so payouts can be read off a single
screen instead of computed manually.

## Decisions

| Question | Decision |
|---|---|
| Commission base | `subtotal - discount_amount` (products after discount, delivery fee excluded) |
| Qualifying order statuses | `delivered`, `accepted` only |
| Influencer representation | Dedicated `influencers` table; one influencer may own several codes |
| Payout tracking | Recorded in-app via a `influencer_payouts` ledger with a "record payment" action |
| Rate changes | Snapshotted onto the order at insert time; editing a rate never rewrites history |

Defaults: commission 3.00%, discount 5% (expressed with the existing
`discount_type='percentage'` + `discount_value=5`). Both editable per code.

## Existing state

`orders` already carries `subtotal`, `discount_amount`, `promo_code_id`, and
`promo_code_snapshot` (`supabase_schema.sql:695-698`). The order insert at
`src/pages/CheckoutPage.tsx:190` already populates them. This design is additive —
no existing write path changes.

## Data model

### New table: `influencers`

```
id                      UUID PK
name                    VARCHAR(255) NOT NULL
phone                   VARCHAR(20)
instagram_handle        VARCHAR(100)
notes                   TEXT
default_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 3.00
is_active               BOOLEAN NOT NULL DEFAULT true
created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()
```

`default_commission_rate` seeds the field in the coupon form; it is not itself used
in any calculation.

### New table: `influencer_payouts`

```
id             UUID PK
influencer_id  UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE
amount         DECIMAL(10,2) NOT NULL CHECK (amount > 0)
paid_at        TIMESTAMPTZ NOT NULL DEFAULT now()
method         VARCHAR(30)          -- 'cash' | 'transfer'
note           TEXT
created_at     TIMESTAMPTZ DEFAULT now()
```

### New columns on `promo_codes`

```
influencer_id    UUID REFERENCES influencers(id) ON DELETE SET NULL
commission_rate  DECIMAL(5,2)      -- NULL for non-influencer codes
```

A code with `influencer_id IS NULL` behaves exactly as today.

### New columns on `orders` (the snapshot)

```
influencer_id              UUID REFERENCES influencers(id) ON DELETE SET NULL
influencer_commission_rate DECIMAL(5,2)
```

## Server-side snapshot trigger

`orders` has an open `Allow public insert access` policy
(`supabase_schema.sql:486`), and `promo_codes` is publicly readable and writable
(`supabase_schema.sql:702-705`). A client-supplied commission rate would therefore
be forgeable. Both snapshot columns are written **only** by a database trigger:

```
BEFORE INSERT ON orders
  -> look up NEW.promo_code_id in promo_codes
  -> set NEW.influencer_id              := promo_codes.influencer_id
  -> set NEW.influencer_commission_rate := promo_codes.commission_rate
  -> if promo_code_id IS NULL, both stay NULL
```

The trigger overwrites whatever the client sent. `SECURITY DEFINER` with a pinned
`search_path`. `CheckoutPage.tsx` is not modified.

Note: the broader RLS problem on `orders` and `promo_codes` is tracked separately by
the staged hardening migration on commit `a4c01d4`. This design does not depend on
that work landing, and does not widen the existing exposure.

## Commission amount is derived, not stored

Amount is computed in the views as
`(subtotal - discount_amount) * influencer_commission_rate / 100`.

Storing only the rate means a later correction to an order's `subtotal` flows through
to the commission automatically, while the rate itself stays frozen at its value on
the order date.

## Views

### `influencer_code_stats` — per-code breakdown

Source: `orders` where `influencer_id IS NOT NULL` and `status IN ('delivered','accepted')`,
grouped by `(influencer_id, promo_code_snapshot, influencer_commission_rate)`.

The rate is part of the grouping key on purpose. If a code's rate is edited from 3% to
5% partway through a campaign, that code yields two rows — the orders at 3% and the
orders at 5% — each with its own correct total. Grouping by code alone would leave the
displayed rate ambiguous.

```
influencer_id, promo_code_id, code, commission_rate,
orders_count    = COUNT(*)
gross_sales     = SUM(subtotal - discount_amount)
commission_due  = SUM((subtotal - discount_amount) * influencer_commission_rate / 100)
```

Grouping on `promo_code_snapshot` (not `promo_code_id`) keeps historical rows legible
after a code is deleted. Repeated use of one code collapses into a single row with
its running totals — this is the core requirement.

### `influencer_account_summary` — one line per influencer

```
influencer_id, name,
codes_count,        -- all codes assigned to the influencer, including ones with zero orders
orders_count, gross_sales,
commission_earned,
total_paid,
balance_due = commission_earned - total_paid
```

Built from two independent CTEs — one aggregating orders, one aggregating payouts —
then `LEFT JOIN`ed onto `influencers`. Joining the orders and payouts tables directly
before aggregating would fan out rows and multiply both totals; the CTE form is
required, not stylistic.

## Admin UI

New `/admin/influencers` section, following the modular admin tree.

| File | Role |
|---|---|
| `src/services/influencersService.ts` | All Supabase access — CRUD, view reads, payout insert |
| `src/pages/admin/hooks/useInfluencers.ts` | Data, mutations, form state |
| `src/pages/admin/tabs/InfluencersTab.tsx` | Main table |
| `src/pages/admin/pages/InfluencersPage.tsx` | Route target |
| `src/pages/admin/dialogs/InfluencerFormDialog.tsx` | Create / edit influencer |
| `src/pages/admin/dialogs/InfluencerStatementDialog.tsx` | Statement + record payment |

Registered in `AdminApp.tsx` and `AdminSidebar.tsx`.

**Main table** — one row per influencer: name, codes count, orders count, gross sales,
commission earned, paid, and **balance due** (visually emphasised). Row action opens
the statement.

**Statement dialog** — two parts:
1. Per-code breakdown from `influencer_code_stats`: code, discount %, commission %,
   orders, sales, commission.
2. Payout history plus a **Record payment** action (amount, method, note). The amount
   field is pre-filled with the outstanding balance and remains editable.

**`CouponFormDialog` changes** — two added fields:
- Influencer select (optional, defaults to "none")
- Commission rate input, shown only when an influencer is selected, pre-filled from
  that influencer's `default_commission_rate`, editable per code.

**Bilingual** — `admin.influencers.*` keys added to both `src/locales/en.json` and
`src/locales/ar.json`. No hardcoded strings in components. RTL conventions per
CLAUDE.md apply to the new table and dialogs.

## Error handling

- Deleting an influencer nulls `promo_codes.influencer_id` and leaves order snapshots
  intact. Confirm dialog states how many codes will be detached.
- A payout larger than the outstanding balance warns but is allowed (advances happen).
- Views are read-only; all writes go through `influencersService.ts`.
- A coupon with an influencer but a null `commission_rate` falls back to 0% rather
  than failing the order insert.

## Testing

SQL assertions:
- A `returned` order contributes nothing.
- Editing `promo_codes.commission_rate` leaves existing orders' commission unchanged.
- One code used across many orders yields a single row with correct sums.
- An influencer with several payouts shows correct, non-multiplied totals.
- An order with no promo code gets `influencer_id IS NULL`.
- A client-supplied `influencer_commission_rate` on insert is discarded by the trigger.

Playwright: create influencer -> attach to a coupon -> open statement -> record a
payment and see the balance drop.

## Out of scope

- Influencer-facing self-service page or login.
- Automatic payout execution — recording is manual.
- Multi-tier or per-product commission rates.
