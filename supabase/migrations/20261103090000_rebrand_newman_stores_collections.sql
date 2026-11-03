-- Rebrand A01Luxe -> Newman Stores Collections and order prefix A01L- -> NSC-.
-- Safe to run on the existing database: historical A01L- orders remain trackable.
-- New orders must use the NSC- prefix.

UPDATE public.site_settings
SET
  brand = 'Newman Stores Collections',
  logo_url = CASE
    WHEN logo_url IS NULL OR logo_url = '' OR logo_url ILIKE '%a01luxe%'
    THEN '/newman-stores-logo.png'
    ELSE logo_url
  END,
  tagline = COALESCE(NULLIF(tagline, ''), 'Curated footwear, elevated.'),
  hero = COALESCE(hero, '{}'::jsonb) || jsonb_build_object(
    'headline', 'Newman Stores Collections',
    'subheadline', COALESCE(
      NULLIF(hero->>'subheadline', ''),
      'Curated branded and unbranded high-quality sneakers.'
    )
  ),
  footer = COALESCE(footer, '{}'::jsonb) || jsonb_build_object(
    'about', COALESCE(NULLIF(footer->>'about', ''), 'Curated footwear for precise everyday movement.'),
    'email', 'care.newmanstorescollections@gmail.com',
    'columns', '[
      {"title":"Quick Links","links":[
        {"label":"Shop","href":"/shop"},
        {"label":"About Us","href":"/about"},
        {"label":"Contact","href":"/contact"}
      ]},
      {"title":"Customer Care","links":[
        {"label":"FAQ","href":"/faq"},
        {"label":"Shipping & Returns","href":"/shipping-returns"},
        {"label":"Track Order","href":"/track-order"},
        {"label":"Care Instructions","href":"/care"},
        {"label":"Size Guide","href":"/size-guide"}
      ]}
    ]'::jsonb,
    'copyright', 'Copyright (c) 2026 Newman Stores Collections. All rights reserved.'
  ),
  updated_at = now()
WHERE id = 1;

ALTER TABLE public.site_settings
  ALTER COLUMN brand SET DEFAULT 'Newman Stores Collections',
  ALTER COLUMN logo_url SET DEFAULT '/newman-stores-logo.png';

CREATE OR REPLACE FUNCTION public.create_order_public(
  _order_id text,
  _customer jsonb,
  _items jsonb,
  _total_cents integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  clean_order_id text := upper(trim(_order_id));
  expected_count integer;
  actual_count integer;
  subtotal integer;
  delivery_fee integer;
  normalized_items jsonb;
BEGIN
  IF clean_order_id !~ '^NSC-[A-Z0-9]{4,16}$' THEN
    RAISE EXCEPTION 'Invalid order ID';
  END IF;

  IF jsonb_typeof(_customer) <> 'object'
    OR length(trim(coalesce(_customer->>'name', ''))) < 2
    OR length(trim(coalesce(_customer->>'email', ''))) < 5
    OR length(trim(coalesce(_customer->>'phone', ''))) < 5
    OR length(trim(coalesce(_customer->>'address', ''))) < 5 THEN
    RAISE EXCEPTION 'Customer details are incomplete';
  END IF;

  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  DROP TABLE IF EXISTS order_items_tmp;
  CREATE TEMP TABLE order_items_tmp ON COMMIT DROP AS
  SELECT
    (value->>'product_id')::uuid AS product_id,
    NULLIF(trim(coalesce(value->>'size', '')), '') AS size,
    NULLIF(trim(coalesce(value->>'color', '')), '') AS color,
    (value->>'qty')::integer AS qty
  FROM jsonb_array_elements(_items)
  WHERE (value->>'product_id') ~* '^[0-9a-f-]{36}$'
    AND (value->>'qty') ~ '^[0-9]+$'
    AND (value->>'qty')::integer BETWEEN 1 AND 20;

  SELECT jsonb_array_length(_items), count(*) INTO expected_count, actual_count FROM order_items_tmp;
  IF actual_count <> expected_count THEN
    RAISE EXCEPTION 'Cart contains invalid items';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM order_items_tmp t
    LEFT JOIN public.products p ON p.id = t.product_id
    WHERE p.id IS NULL
  ) THEN
    RAISE EXCEPTION 'One or more products no longer exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM order_items_tmp t
    JOIN public.products p ON p.id = t.product_id
    WHERE p.has_other_colors
      AND cardinality(p.colors) > 0
      AND (
        t.color IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM unnest(p.colors) c WHERE lower(c) = lower(t.color)
        )
      )
  ) THEN
    RAISE EXCEPTION 'Please select a valid color';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT product_id, sum(qty)::integer AS qty
      FROM order_items_tmp
      GROUP BY product_id
    ) g
    JOIN public.products p ON p.id = g.product_id
    WHERE p.sold_out OR p.stock < g.qty
  ) THEN
    RAISE EXCEPTION 'One or more products are sold out';
  END IF;

  SELECT
    coalesce(sum(p.price_cents * t.qty), 0)::integer,
    jsonb_agg(
      jsonb_build_object(
        'product_id', p.id,
        'name', p.name,
        'image', coalesce(p.images[1], ''),
        'size', t.size,
        'color', t.color,
        'qty', t.qty,
        'price_cents', p.price_cents
      )
      ORDER BY p.name
    )
  INTO subtotal, normalized_items
  FROM order_items_tmp t
  JOIN public.products p ON p.id = t.product_id;

  delivery_fee := greatest(0, least(coalesce((_customer->>'delivery_fee_cents')::integer, 0), 10000000));
  IF _total_cents <> subtotal + delivery_fee THEN
    RAISE EXCEPTION 'Order total changed. Please refresh checkout.';
  END IF;

  INSERT INTO public.orders (order_id, customer, items, total_cents, status)
  VALUES (
    clean_order_id,
    _customer,
    normalized_items,
    _total_cents,
    'pending'
  );

  UPDATE public.products p
  SET stock = greatest(p.stock - g.qty, 0),
      purchases = p.purchases + g.qty,
      sold_out = CASE WHEN greatest(p.stock - g.qty, 0) = 0 THEN true ELSE p.sold_out END,
      updated_at = now()
  FROM (
    SELECT product_id, sum(qty)::integer AS qty
    FROM order_items_tmp
    GROUP BY product_id
  ) g
  WHERE p.id = g.product_id;

  RETURN true;
END;
$$;

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
    AND trim(_order_id) ~* '^(A01L|NSC)-[A-Z0-9]{4,16}$'
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
  IF clean_order_id !~* '^(A01L|NSC)-[A-Z0-9]{4,16}$' THEN
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

REVOKE ALL ON FUNCTION public.create_order_public(text, jsonb, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_public(text, jsonb, jsonb, integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.track_order_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order_public(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.upload_receipt_public(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upload_receipt_public(text, text) TO anon, authenticated, service_role;
