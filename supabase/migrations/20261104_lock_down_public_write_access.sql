-- APPLIED 2026-11-04. Recorded here to keep the repo in step with the project.
--
-- Closed anonymous write access to the catalogue and orders, and anonymous read
-- access to orders and users.
--
-- What was verified beforehand, against the live project, using only the anon
-- key that Vite publishes in the site bundle:
--   * PATCH on a real perfumes row was APPLIED (HTTP 200, 1 row affected) by an
--     unauthenticated caller — prices, names and stock were rewritable, and
--     DELETE was granted too.
--   * All 22 orders were readable: names, phones, emails, cities, items, totals.
--   * users.password was readable in plain text, i.e. full admin access.
--
-- anon held INSERT/UPDATE/DELETE/TRUNCATE on all 21 public tables. On the five
-- tables below RLS was off, so those grants were unconditional and the policies
-- that existed were inert.
--
-- Preserved, each checked against the code first:
--   * public SELECT on the catalogue — the storefront only reads it
--   * authenticated INSERT on orders — CheckoutPage inserts and never updates,
--     so checkout still works
--   * own-order SELECT for /my-orders and the order-success page
--
-- Knowingly broken until the admin panel moves to the service role: admin
-- product and order writes, and the gift builder's INSERT into perfumes. The
-- owner chose to close the hole first and migrate the panel after.
--
-- Still outstanding: 12 of 22 orders have a null user_id and are invisible
-- under the own-order policy; they need an email-to-auth.users backfill.

ALTER TABLE public.perfumes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfume_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfume_samples      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfume_bottle_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to active perfumes" ON public.perfumes;
DROP POLICY IF EXISTS "Allow authenticated users to manage perfumes" ON public.perfumes;
CREATE POLICY "catalogue readable" ON public.perfumes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access to perfume_images" ON public.perfume_images;
DROP POLICY IF EXISTS "Allow authenticated users to insert perfume_images" ON public.perfume_images;
DROP POLICY IF EXISTS "Allow authenticated users to update perfume_images" ON public.perfume_images;
DROP POLICY IF EXISTS "Allow authenticated users to delete perfume_images" ON public.perfume_images;
CREATE POLICY "images readable" ON public.perfume_images FOR SELECT USING (true);

CREATE POLICY "samples readable"      ON public.perfume_samples      FOR SELECT USING (true);
CREATE POLICY "bottle sizes readable" ON public.perfume_bottle_sizes FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.perfumes, public.perfume_images,
     public.perfume_samples, public.perfume_bottle_sizes
  FROM anon, authenticated;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access"      ON public.orders;
DROP POLICY IF EXISTS "Allow public insert access"    ON public.orders;
DROP POLICY IF EXISTS "Allow update access to orders" ON public.orders;

CREATE POLICY "own orders readable" ON public.orders
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own orders insertable" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.orders FROM anon, authenticated;
REVOKE INSERT, SELECT ON public.orders FROM anon;

-- No code path truncates anything; the grant is pure downside.
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- users: RLS was on but a single `SELECT USING (true)` policy exposed every
-- admin row. Safe now that authenticateAdmin() calls the admin-auth edge
-- function instead of querying this table from the browser.
DROP POLICY IF EXISTS "Allow public read access to users" ON public.users;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.users FROM anon, authenticated;
