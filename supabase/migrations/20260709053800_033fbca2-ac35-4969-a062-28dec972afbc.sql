ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}';

UPDATE public.user_roles
SET permissions = ARRAY['content','products','orders','staffs','accounts','notifications']::text[]
WHERE role = 'admin' AND (permissions IS NULL OR permissions = '{}');

UPDATE public.user_roles
SET permissions = ARRAY['products','orders','notifications']::text[]
WHERE role = 'staff' AND (permissions IS NULL OR permissions = '{}');

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = 'admin'
        OR _permission = ANY(permissions)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','staff')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role, permissions)
    VALUES (NEW.id, 'admin', ARRAY['content','products','orders','staffs','accounts','notifications']::text[]);
  ELSIF lower(NEW.email) = 'selorahealth@gmail.com' AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, permissions)
    VALUES (NEW.id, 'admin', ARRAY['content','products','orders','staffs','accounts','notifications']::text[])
    ON CONFLICT (user_id, role) DO UPDATE
      SET permissions = EXCLUDED.permissions;
  END IF;
  RETURN NEW;
END
$$;

UPDATE public.site_settings
SET
  brand = 'Newman Stores Collections',
  logo_url = COALESCE(NULLIF(logo_url, ''), '/newman-stores-logo.png'),
  tagline = COALESCE(NULLIF(tagline, ''), 'Curated footwear, elevated.'),
  theme = jsonb_build_object(
    'background', '#212121',
    'foreground', '#F4EEE8',
    'card', '#2A2A2A',
    'primary', '#D4FF00',
    'accent', '#D4FF00'
  ),
  currency = '{"symbol":"₦","code":"NGN"}'::jsonb,
  footer = jsonb_build_object(
    'about', COALESCE(footer->>'about', 'Curated footwear for precise everyday movement.'),
    'address', COALESCE(NULLIF(footer->>'address', ''), 'Lagos. Abuja. Ibadan'),
    'phone', COALESCE(NULLIF(footer->>'phone', ''), '+234 902 601 6812'),
    'email', COALESCE(NULLIF(footer->>'email', ''), 'care.newmanstorescollections@gmail.com'),
    'socials', COALESCE(footer->'socials', '{"instagram":"","tiktok":"","facebook":"","whatsappChannel":""}'::jsonb),
    'columns', COALESCE(footer->'columns', '[{"title":"Quick Links","links":[{"label":"Shop","href":"/shop"},{"label":"About Newman Stores Collections","href":"/about"},{"label":"Contact","href":"/contact"}]},{"title":"Customer Care","links":[{"label":"FAQ","href":"/faq"},{"label":"Shipping & Returns","href":"/shipping-returns"},{"label":"Track Order","href":"/track-order"},{"label":"Care Instructions","href":"/care"},{"label":"Size Guide","href":"/size-guide"}]}]'::jsonb),
    'copyright', 'Copyright (c) 2026 Newman Stores Collections. All rights reserved.'
  )
WHERE id = 1;

ALTER TABLE public.site_settings
  ALTER COLUMN brand SET DEFAULT 'Newman Stores Collections',
  ALTER COLUMN logo_url SET DEFAULT '/newman-stores-logo.png',
  ALTER COLUMN tagline SET DEFAULT 'Curated footwear, elevated.',
  ALTER COLUMN theme SET DEFAULT '{"background":"#212121","foreground":"#F4EEE8","card":"#2A2A2A","primary":"#D4FF00","accent":"#D4FF00"}'::jsonb,
  ALTER COLUMN currency SET DEFAULT '{"symbol":"₦","code":"NGN"}'::jsonb,
  ALTER COLUMN footer SET DEFAULT '{"about":"Curated footwear for precise everyday movement.","email":"care.newmanstorescollections@gmail.com","phone":"+234 902 601 6812","address":"Lagos. Abuja. Ibadan","columns":[{"title":"Quick Links","links":[{"label":"Shop","href":"/shop"},{"label":"About Newman Stores Collections","href":"/about"},{"label":"Contact","href":"/contact"}]},{"title":"Customer Care","links":[{"label":"FAQ","href":"/faq"},{"label":"Shipping & Returns","href":"/shipping-returns"},{"label":"Track Order","href":"/track-order"},{"label":"Care Instructions","href":"/care"},{"label":"Size Guide","href":"/size-guide"}]}],"socials":{"instagram":"","tiktok":"","facebook":"","whatsappChannel":""},"copyright":"Copyright (c) 2026 Newman Stores Collections. All rights reserved."}'::jsonb;

REVOKE ALL ON public.products FROM anon, authenticated;
GRANT SELECT (id, name, slug, brand, category_id, subcategory_id, price_cents, description, sizes, stock, sold_out, images, purchases, featured, created_at, updated_at, low_stock_threshold, has_other_colors, colors) ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

DROP POLICY IF EXISTS "public read products" ON public.products;
DROP POLICY IF EXISTS "staff write products" ON public.products;
DROP POLICY IF EXISTS "public can read storefront products" ON public.products;
DROP POLICY IF EXISTS "staff manage products" ON public.products;
CREATE POLICY "public can read storefront products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (true);
CREATE POLICY "permitted staff manage products"
ON public.products
FOR ALL
TO authenticated
USING (public.has_permission(auth.uid(), 'products'))
WITH CHECK (public.has_permission(auth.uid(), 'products'));

REVOKE ALL ON public.orders FROM anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

DROP POLICY IF EXISTS "public insert orders" ON public.orders;
DROP POLICY IF EXISTS "staff read orders" ON public.orders;
DROP POLICY IF EXISTS "staff update orders" ON public.orders;
DROP POLICY IF EXISTS "permitted staff read orders" ON public.orders;
DROP POLICY IF EXISTS "permitted staff update orders" ON public.orders;
DROP POLICY IF EXISTS "permitted staff delete orders" ON public.orders;
CREATE POLICY "permitted staff read orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.has_permission(auth.uid(), 'orders'));
CREATE POLICY "permitted staff update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), 'orders'))
WITH CHECK (public.has_permission(auth.uid(), 'orders'));
CREATE POLICY "permitted staff delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (public.has_permission(auth.uid(), 'orders'));

REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "users read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.site_settings FROM anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

DROP POLICY IF EXISTS "public read settings" ON public.site_settings;
DROP POLICY IF EXISTS "staff update settings" ON public.site_settings;
DROP POLICY IF EXISTS "permitted staff update settings" ON public.site_settings;
CREATE POLICY "public read settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);
CREATE POLICY "permitted staff update settings"
ON public.site_settings
FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), 'content'))
WITH CHECK (public.has_permission(auth.uid(), 'content'));

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff_or_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_stock(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.track_order_public(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upload_receipt_public(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_public(text, jsonb, jsonb, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_order_public(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upload_receipt_public(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_order_public(text, jsonb, jsonb, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) TO service_role;

INSERT INTO public.user_roles (user_id, role, permissions)
SELECT id, 'admin'::public.app_role, ARRAY['content','products','orders','staffs','accounts','notifications']::text[]
FROM auth.users
WHERE lower(email) = 'selorahealth@gmail.com'
ON CONFLICT (user_id, role) DO UPDATE
  SET permissions = EXCLUDED.permissions;