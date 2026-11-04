-- ============================================================================
-- Close the anon-key read holes on `users` and `orders`.
--
-- WHAT WAS WRONG
-- The anon key is inlined into the public site bundle by Vite, so it is not a
-- secret — it is a public identifier, and every policy granting `public` access
-- is effectively granting the whole internet access. Both tables did exactly
-- that:
--
--   users   RLS on, one policy: SELECT USING (true)  -> anyone could read every
--           admin row, including the plain-text `password` column.
--   orders  RLS OFF entirely (three policies defined but inert) -> anyone could
--           read all 22 orders: names, phones, emails, addresses, items, totals.
--
-- Verified against the live project with nothing but the published anon key.
--
-- ORDER OF OPERATIONS — READ BEFORE RUNNING
-- Each stage breaks the CURRENTLY DEPLOYED bundle, which still authenticates
-- admins client-side and reads orders with the anon key. Run a stage only once
-- the matching code is deployed, or the site breaks.
--
--   Stage 1 (users)  requires: `supabase functions deploy admin-auth`
--                    and the new bundle live on admin.shama.ly.
--                    Blast radius if run early: admin login stops working.
--                    Customers are unaffected.
--
--   Stage 2 (orders) requires: the admin panel reading/writing orders through a
--                    service-role edge function instead of the anon key.
--                    THAT CODE DOES NOT EXIST YET. Running stage 2 before it
--                    does will break the admin order list AND /my-orders, and
--                    INSERT changes can stop checkout — i.e. lost sales.
--                    Stage 2 is left commented out deliberately.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- STAGE 1 — users: no anon access at all.
-- The only consumer was authenticateAdmin(), now served by the admin-auth
-- edge function using the service-role key, which bypasses RLS.
-- ---------------------------------------------------------------------------
BEGIN;

DROP POLICY IF EXISTS "Allow public read access to users" ON public.users;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- FORCE so the table owner is subject to policies too; without it a superuser
-- connection silently bypasses them and masks mistakes in testing.
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- No policy is created on purpose. RLS with zero policies denies everything to
-- anon and authenticated; the service role bypasses RLS and keeps working.
REVOKE ALL ON public.users FROM anon, authenticated;

COMMIT;


-- ---------------------------------------------------------------------------
-- STAGE 2 — orders. DO NOT RUN YET (see header).
--
-- Blocked on two things:
--   1. The admin panel must stop reading orders with the anon key.
--   2. 12 of 22 existing orders have a NULL user_id, so an owner-scoped policy
--      would hide them from the customers they belong to. Backfill user_id by
--      matching orders.email to auth.users.email first, and decide what to do
--      with any that still cannot be matched.
--
-- BEGIN;
--   DROP POLICY IF EXISTS "Allow public read access"   ON public.orders;
--   DROP POLICY IF EXISTS "Allow public insert access" ON public.orders;
--   DROP POLICY IF EXISTS "Allow update access to orders" ON public.orders;
--
--   ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;
--
--   -- A customer sees only their own orders.
--   CREATE POLICY "own orders readable" ON public.orders
--     FOR SELECT TO authenticated
--     USING (user_id = auth.uid());
--
--   -- …and may only create an order attributed to themselves. Checkout has
--   -- required login since fbe3f03, so there is no anonymous-insert case left.
--   CREATE POLICY "own orders insertable" ON public.orders
--     FOR INSERT TO authenticated
--     WITH CHECK (user_id = auth.uid());
--
--   -- No UPDATE/DELETE policy: status changes are an admin action and belong to
--   -- the service role, not to anything holding the anon key.
--   REVOKE ALL ON public.orders FROM anon;
-- COMMIT;
