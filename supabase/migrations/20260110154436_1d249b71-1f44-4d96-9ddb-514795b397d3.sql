-- Update the Standard plan to be the Test Plan for $1/month
UPDATE public.plans 
SET 
  name = 'Test Plan',
  price_monthly = 100,
  price_yearly = 1000,
  features = '["Test feature 1", "Test feature 2", "Email support"]'::jsonb,
  stripe_price_id_monthly = 'price_1So41S5EJKKhWAGtUXi0AOBs',
  stripe_price_id_yearly = NULL,
  updated_at = now()
WHERE tier = 'basic';

-- Clean up all subscriptions for fresh Stripe testing
DELETE FROM public.subscriptions;