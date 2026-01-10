-- Update Standard plan with Stripe Price IDs and correct prices
UPDATE public.plans 
SET 
  stripe_price_id_monthly = 'price_1So3d35EJKKhWAGtsDQFumMU',
  stripe_price_id_yearly = 'price_1So3ff5EJKKhWAGtYcj2lxkf',
  price_monthly = 699,
  price_yearly = 7499,
  updated_at = now()
WHERE tier = 'basic';

-- Update Premium plan with Stripe Price IDs and correct prices
UPDATE public.plans 
SET 
  stripe_price_id_monthly = 'price_1So3ds5EJKKhWAGtLJuvIDTZ',
  stripe_price_id_yearly = 'price_1So3hF5EJKKhWAGtoynaOtj9',
  price_monthly = 899,
  price_yearly = 9499,
  updated_at = now()
WHERE tier = 'pro';