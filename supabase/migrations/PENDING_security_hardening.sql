-- ===========================================================================
-- ⚠️  PENDING — DO NOT RUN ON PRODUCTION YET.
--
-- Shama security hardening — same fix already applied to Sahma Dupes.
-- Closes: anon-key catalog writes (USING(true) policies), plaintext admin
-- credentials readable by the public, RLS disabled on samples/bottle sizes.
--
-- ORDER OF OPERATIONS (must ship together):
--   1. Port the Sahma Dupes admin-auth frontend (authService.ts via Supabase
--      Auth + admin_users allowlist) to this repo and deploy it.
--   2. Create the admin auth user (see DO block — set a strong password).
--   3. Run this migration.
--   Running this file with the OLD admin panel still deployed will break
--   all admin writes (they rely on the permissive policies removed here).
-- ===========================================================================

-- 1. Admin allowlist + helper -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can check own admin status" ON public.admin_users
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) $$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 2. Create the admin auth user (EDIT EMAIL + PASSWORD FIRST) ---------------
DO $$
DECLARE uid uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@shama.ly') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
      email_change, phone_change, phone_change_token, reauthentication_token)
    VALUES ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'admin@shama.ly', crypt('CHANGE_ME_STRONG_PASSWORD', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}', '{"role":"admin"}', now(), now(),
      '', '', '', '', '', '', '', '');
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', 'admin@shama.ly', 'email_verified', true),
      'email', now(), now(), now());
    INSERT INTO public.admin_users (user_id) VALUES (uid);
  END IF;
END $$;

-- 3. Replace permissive write policies with is_admin() ----------------------
DROP POLICY IF EXISTS "Allow authenticated users to manage perfumes" ON perfumes;
DROP POLICY IF EXISTS "Allow public read access to active perfumes" ON perfumes;
CREATE POLICY "Public read active perfumes or admin all" ON perfumes
  FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admin insert perfumes" ON perfumes FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin update perfumes" ON perfumes FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin delete perfumes" ON perfumes FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated users to insert perfume_images" ON perfume_images;
DROP POLICY IF EXISTS "Allow authenticated users to update perfume_images" ON perfume_images;
DROP POLICY IF EXISTS "Allow authenticated users to delete perfume_images" ON perfume_images;
CREATE POLICY "Admin insert perfume_images" ON perfume_images FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin update perfume_images" ON perfume_images FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin delete perfume_images" ON perfume_images FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Public insert promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Public update promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Public delete promo codes" ON promo_codes;
CREATE POLICY "Admin insert promo codes" ON promo_codes FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin update promo codes" ON promo_codes FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin delete promo codes" ON promo_codes FOR DELETE USING (public.is_admin());

-- reviews / memories / gift orders moderation
CREATE POLICY "Admin read all reviews"  ON reviews  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin update reviews"    ON reviews  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin delete reviews"    ON reviews  FOR DELETE USING (public.is_admin());
CREATE POLICY "Admin read all memories" ON memories FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin update memories"   ON memories FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin delete memories"   ON memories FOR DELETE USING (public.is_admin());
CREATE POLICY "Admin read all gift orders" ON custom_gift_orders FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin update gift orders"   ON custom_gift_orders FOR UPDATE USING (public.is_admin());

-- orders: admin-only status updates (guest INSERT stays public)
DROP POLICY IF EXISTS "Allow update access to orders" ON orders;
CREATE POLICY "Admin update orders" ON orders FOR UPDATE USING (public.is_admin());

-- 4. RLS on samples/bottle sizes (currently DISABLED — ERROR-level advisor) -
ALTER TABLE perfume_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfume_bottle_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read samples" ON perfume_samples FOR SELECT USING (true);
CREATE POLICY "Admin write samples" ON perfume_samples FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin update samples" ON perfume_samples FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin delete samples" ON perfume_samples FOR DELETE USING (public.is_admin());
CREATE POLICY "Public read bottle sizes" ON perfume_bottle_sizes FOR SELECT USING (true);
CREATE POLICY "Admin write bottle sizes" ON perfume_bottle_sizes FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin update bottle sizes" ON perfume_bottle_sizes FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin delete bottle sizes" ON perfume_bottle_sizes FOR DELETE USING (public.is_admin());

-- 5. Kill the public plaintext-credentials leak ------------------------------
DROP POLICY IF EXISTS "Allow public read access to users" ON users;
REVOKE ALL ON users FROM anon;
REVOKE ALL ON users FROM authenticated;
-- After verifying the new login works: DELETE FROM users;  -- legacy plaintext rows

-- 6. Storage: perfume-images writes admin-only ------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to upload perfume images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update perfume images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete perfume images" ON storage.objects;
CREATE POLICY "Admin upload perfume images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'perfume-images' AND public.is_admin());
CREATE POLICY "Admin update perfume images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'perfume-images' AND public.is_admin());
CREATE POLICY "Admin delete perfume images" ON storage.objects
  FOR DELETE USING (bucket_id = 'perfume-images' AND public.is_admin());

-- 7. Pin search_path on flagged functions -----------------------------------
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.recalculate_perfume_rating() SET search_path = public;

-- ---------------------------------------------------------------------------
-- TODO (added 2026-07-20 with the influencer coupons feature):
-- `influencers` and `influencer_payouts` shipped with the same open public
-- policies as orders/promo_codes for consistency. They expose influencer names,
-- phone numbers, and payout amounts to the anon key. Lock both down to the
-- admin role in the same pass that fixes orders and promo_codes.
-- ---------------------------------------------------------------------------
