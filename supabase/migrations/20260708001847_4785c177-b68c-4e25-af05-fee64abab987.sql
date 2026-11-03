ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS has_other_colors boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS colors text[] NOT NULL DEFAULT '{}';

UPDATE public.site_settings
SET
  brand = 'Newman Stores Collections',
  tagline = COALESCE(NULLIF(tagline, ''), 'Curated footwear, elevated.'),
  theme = jsonb_build_object(
    'background', '#212121',
    'foreground', '#F4EEE8',
    'card', '#2A2A2A',
    'primary', '#D4FF00',
    'accent', '#D4FF00'
  ),
  currency = COALESCE(currency, '{"symbol":"₦","code":"NGN"}'::jsonb),
  footer = jsonb_set(
    jsonb_set(
      COALESCE(footer, '{}'::jsonb),
      '{copyright}',
      to_jsonb('Copyright (c) 2026 Newman Stores Collections. All rights reserved.'::text),
      true
    ),
    '{columns}',
    COALESCE(
      footer->'columns',
      '[{"title":"Quick Links","links":[{"label":"Shop","href":"/shop"},{"label":"About Newman Stores Collections","href":"/about"},{"label":"Contact","href":"/contact"}]},{"title":"Customer Care","links":[{"label":"FAQ","href":"/faq"},{"label":"Shipping & Returns","href":"/shipping-returns"},{"label":"Track Order","href":"/track-order"},{"label":"Care Instructions","href":"/care"},{"label":"Size Guide","href":"/size-guide"}]}]'::jsonb
    ),
    true
  )
WHERE id = 1;

ALTER TABLE public.site_settings
  ALTER COLUMN brand SET DEFAULT 'Newman Stores Collections',
  ALTER COLUMN tagline SET DEFAULT 'Curated footwear, elevated.',
  ALTER COLUMN theme SET DEFAULT '{"background":"#212121","foreground":"#F4EEE8","card":"#2A2A2A","primary":"#D4FF00","accent":"#D4FF00"}'::jsonb,
  ALTER COLUMN currency SET DEFAULT '{"symbol":"₦","code":"NGN"}'::jsonb,
  ALTER COLUMN footer SET DEFAULT '{"about":"Curated footwear for precise everyday movement.","email":"hello@newmanstorescollections.com","phone":"","address":"Lagos, Nigeria","columns":[{"title":"Quick Links","links":[{"label":"Shop","href":"/shop"},{"label":"About Newman Stores Collections","href":"/about"},{"label":"Contact","href":"/contact"}]},{"title":"Customer Care","links":[{"label":"FAQ","href":"/faq"},{"label":"Shipping & Returns","href":"/shipping-returns"},{"label":"Track Order","href":"/track-order"},{"label":"Care Instructions","href":"/care"},{"label":"Size Guide","href":"/size-guide"}]}],"socials":{"instagram":"","tiktok":"","facebook":"","whatsappChannel":""},"copyright":"Copyright (c) 2026 Newman Stores Collections. All rights reserved."}'::jsonb;

CREATE OR REPLACE FUNCTION public.track_order_public(_order_id text)
RETURNS TABLE (
  order_id text,
  status text,
  total_cents integer,
  created_at timestamptz,
  items jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.order_id, o.status, o.total_cents, o.created_at, o.items
  FROM public.orders o
  WHERE lower(o.order_id) = lower(trim(_order_id))
    AND trim(_order_id) ~* '^NSC-[A-Z0-9]{4,16}$'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.upload_receipt_public(_order_id text, _receipt_url text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_order_id text := trim(_order_id);
  clean_url text := trim(_receipt_url);
BEGIN
  IF clean_order_id !~* '^NSC-[A-Z0-9]{4,16}$' THEN
    RAISE EXCEPTION 'Invalid order ID';
  END IF;
  IF clean_url = '' OR length(clean_url) > 2000 THEN
    RAISE EXCEPTION 'Invalid receipt URL';
  END IF;

  UPDATE public.orders
  SET customer = jsonb_set(
      jsonb_set(customer, '{receipt_url}', to_jsonb(clean_url), true),
      '{receipt_uploaded_at}', to_jsonb(now()::text), true
    ),
    updated_at = now()
  WHERE lower(order_id) = lower(clean_order_id);

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.track_order_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order_public(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.upload_receipt_public(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upload_receipt_public(text, text) TO anon, authenticated, service_role;

-- Products: public can read storefront-safe columns, internal source (cc) stays server/admin-only.
REVOKE ALL ON public.products FROM anon, authenticated;
GRANT SELECT (id, name, slug, brand, category_id, subcategory_id, price_cents, description, sizes, stock, sold_out, images, purchases, featured, created_at, updated_at, low_stock_threshold, has_other_colors, colors) ON public.products TO anon, authenticated;
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
CREATE POLICY "staff manage products"
ON public.products
FOR ALL
TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Orders: customers can create; only staff/admin can list or change status. Exact-ID tracking goes through track_order_public().
REVOKE ALL ON public.orders FROM anon, authenticated;
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

DROP POLICY IF EXISTS "public insert orders" ON public.orders;
DROP POLICY IF EXISTS "staff read orders" ON public.orders;
DROP POLICY IF EXISTS "staff update orders" ON public.orders;
CREATE POLICY "public insert orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
CREATE POLICY "staff read orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "staff update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Staff roles: never public; users can read their own role and admins can manage via server functions.
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

-- Site settings remain public-readable, staff/admin editable.
REVOKE ALL ON public.site_settings FROM anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

DROP POLICY IF EXISTS "public read settings" ON public.site_settings;
DROP POLICY IF EXISTS "staff update settings" ON public.site_settings;
CREATE POLICY "public read settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);
CREATE POLICY "staff update settings"
ON public.site_settings
FOR UPDATE
TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Taxonomy is public-readable and staff/admin editable.
REVOKE ALL ON public.categories FROM anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

DROP POLICY IF EXISTS "public read categories" ON public.categories;
DROP POLICY IF EXISTS "staff write categories" ON public.categories;
CREATE POLICY "public read categories"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (true);
CREATE POLICY "staff write categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

REVOKE ALL ON public.subcategories FROM anon, authenticated;
GRANT SELECT ON public.subcategories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subcategories TO authenticated;
GRANT ALL ON public.subcategories TO service_role;

DROP POLICY IF EXISTS "public read subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "staff write subcategories" ON public.subcategories;
CREATE POLICY "public read subcategories"
ON public.subcategories
FOR SELECT
TO anon, authenticated
USING (true);
CREATE POLICY "staff write subcategories"
ON public.subcategories
FOR ALL
TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Ensure the requested owner/admin account always has admin role when present.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'selorahealth@gmail.com'
ON CONFLICT DO NOTHING;