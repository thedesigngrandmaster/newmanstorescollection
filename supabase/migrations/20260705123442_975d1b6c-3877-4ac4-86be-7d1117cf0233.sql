-- 1) Grant admin to selorahealth@gmail.com now (if already signed up) + on future signup
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'selorahealth@gmail.com'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSIF lower(NEW.email) = 'selorahealth@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Low-stock threshold on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 3;

-- 3) Update site_settings defaults: Neo-Industrial theme + hero video + CTA image + footer
UPDATE public.site_settings
SET
  theme = jsonb_build_object(
    'background', '#212121',
    'foreground', '#F4EEE8',
    'card', '#2a2a2a',
    'primary', '#D4FF00',
    'accent', '#D4FF00'
  ),
  hero = COALESCE(hero, '{}'::jsonb) || jsonb_build_object(
    'mediaUrl', '/hero-video.mp4',
    'mediaType', 'video',
    'overlay', 0.55,
    'headline', COALESCE(hero->>'headline', 'Step Into Something Legendary'),
    'subheadline', COALESCE(hero->>'subheadline', 'Curated branded & unbranded sneakers, engineered for the streets.'),
    'ctaPrimary', COALESCE(hero->>'ctaPrimary', 'Shop the Drop'),
    'ctaSecondary', COALESCE(hero->>'ctaSecondary', 'Track Order')
  ),
  cta = COALESCE(cta, '{}'::jsonb) || jsonb_build_object(
    'heading', COALESCE(cta->>'heading', 'Made for the streets.'),
    'sub', COALESCE(cta->>'sub', 'Fresh drops every week. Get yours before it sells out.'),
    'button', COALESCE(cta->>'button', 'Shop All'),
    'mediaUrl', '/e.png'
  ),
  footer = COALESCE(footer, '{}'::jsonb) || jsonb_build_object(
    'columns', jsonb_build_array(
      jsonb_build_object('title','Shop','links', jsonb_build_array(
        jsonb_build_object('label','All Products','href','/shop'),
        jsonb_build_object('label','Track Order','href','/track-order'),
        jsonb_build_object('label','Size Guide','href','/size-guide'),
        jsonb_build_object('label','Care Instructions','href','/care')
      )),
      jsonb_build_object('title','Help','links', jsonb_build_array(
        jsonb_build_object('label','FAQ','href','/faq'),
        jsonb_build_object('label','Contact','href','/contact'),
        jsonb_build_object('label','Shipping & Returns','href','/shipping-returns'),
        jsonb_build_object('label','Customer Care','href','/customer-care')
      )),
      jsonb_build_object('title','About','links', jsonb_build_array(
        jsonb_build_object('label','Our Story','href','/about')
      ))
    )
  )
WHERE id = 1;