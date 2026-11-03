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

REVOKE ALL ON FUNCTION public.create_order_public(text, jsonb, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_public(text, jsonb, jsonb, integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.decrement_stock(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) TO service_role;

REVOKE INSERT ON public.orders FROM anon, authenticated;
DROP POLICY IF EXISTS "public insert orders" ON public.orders;

GRANT SELECT, INSERT ON storage.objects TO anon, authenticated;
DROP POLICY IF EXISTS "public upload receipts media" ON storage.objects;
CREATE POLICY "public upload receipts media"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'media'
  AND name LIKE 'receipts/%'
  AND octet_length(name) <= 180
);