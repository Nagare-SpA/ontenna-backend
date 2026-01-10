-- Add discount column to subscriptions table for next billing cycle discounts
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS discount_percent integer DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100);

-- Add free subscription end date for admin-granted free periods
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS free_until timestamp with time zone DEFAULT NULL;

-- Add granted_by column to track who gave the free subscription
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS granted_by uuid DEFAULT NULL;

-- Add notes column for admin notes
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS admin_notes text DEFAULT NULL;