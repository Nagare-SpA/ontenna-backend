-- Delete existing plans
DELETE FROM public.plans;

-- Insert Standard plan
INSERT INTO public.plans (name, tier, price_monthly, price_yearly, features, is_active)
VALUES (
  'Standard',
  'basic',
  699,
  6990,
  '["1 hour STT Included", "8 Active Alerts", "4 Music Modes", "6 Sports Modes"]'::jsonb,
  true
);

-- Insert Premium plan
INSERT INTO public.plans (name, tier, price_monthly, price_yearly, features, is_active)
VALUES (
  'Premium',
  'pro',
  799,
  7990,
  '["5 hours STT Included", "20 Active Alerts", "4 Music Modes + Customized Experience", "6 Sports Modes + Reports"]'::jsonb,
  true
);