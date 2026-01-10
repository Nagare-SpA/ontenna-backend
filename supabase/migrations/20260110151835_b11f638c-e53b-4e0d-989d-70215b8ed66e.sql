-- Clean up orphaned profiles (profiles without corresponding auth.users)
-- This deletes profiles where the id doesn't exist in auth.users
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned user_roles
DELETE FROM public.user_roles 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned subscriptions
DELETE FROM public.subscriptions 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned billing_events
DELETE FROM public.billing_events 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned verification_codes
DELETE FROM public.verification_codes 
WHERE user_id NOT IN (SELECT id FROM auth.users);