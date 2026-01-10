-- Restore the Standard plan at $6.99/month
UPDATE public.plans 
SET 
  name = 'Standard',
  price_monthly = 699,
  price_yearly = 6999,
  features = '["3 hours STT Included", "10 Active Alerts", "2 Music Modes", "3 Sports Modes"]'::jsonb,
  stripe_price_id_monthly = 'price_1So3ds5EJKKhWAGtLJuvIDTZ',
  stripe_price_id_yearly = 'price_1So3hF5EJKKhWAGtoynaOtj9',
  updated_at = now()
WHERE tier = 'basic';

-- Insert the $1 Test Plan as free tier entry plan
INSERT INTO public.plans (name, tier, price_monthly, price_yearly, features, stripe_price_id_monthly, stripe_price_id_yearly, is_active)
VALUES (
  'Entry Plan',
  'free',
  100,
  1000,
  '["Test feature 1", "Test feature 2", "Email support"]'::jsonb,
  'price_1So41S5EJKKhWAGtUXi0AOBs',
  NULL,
  true
);