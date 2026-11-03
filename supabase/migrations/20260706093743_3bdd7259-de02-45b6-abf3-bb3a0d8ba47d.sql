
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cc text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS currency jsonb NOT NULL DEFAULT '{"symbol":"₦","code":"NGN"}'::jsonb;
