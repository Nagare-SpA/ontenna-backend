-- Fix: admin "free until" grants never reached personal_accounts -------------
-- The subscription->personal_accounts sync copied current_period_end/trial_end
-- but ignored subscriptions.free_until, so an admin comp grant (a free month or
-- year) never populated personal_accounts.granted_free_until. Once the original
-- trial period ended, the app read an expired entitlement and blocked the user.
--
-- Now free_until is mapped into granted_free_until, and current_period_end is
-- extended to whichever is later so the app sees an active membership even if
-- it only checks current_period_end.

CREATE OR REPLACE FUNCTION public.sync_personal_account_from_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tier TEXT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.personal_accounts
       SET subscription_status = 'canceled',
           current_period_end  = NULL,
           trial_ends_at       = NULL,
           updated_at          = now()
     WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;

  SELECT tier::text INTO v_tier FROM public.plans WHERE id = NEW.plan_id;

  INSERT INTO public.personal_accounts AS pa (
    user_id, status, plan, subscription_status,
    trial_ends_at, current_period_end, granted_free_until,
    stripe_customer_id, stripe_subscription_id, updated_at
  )
  VALUES (
    NEW.user_id, 'active', COALESCE(v_tier, 'trial'), NEW.status::text,
    NEW.trial_end,
    GREATEST(NEW.current_period_end, NEW.free_until),
    NEW.free_until,
    NEW.stripe_customer_id, NEW.stripe_subscription_id, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan                   = EXCLUDED.plan,
    subscription_status    = EXCLUDED.subscription_status,
    trial_ends_at          = EXCLUDED.trial_ends_at,
    -- Reflect the later of the paid period and any admin free grant.
    current_period_end     = GREATEST(NEW.current_period_end, NEW.free_until),
    -- Map the admin comp grant through; never null out an existing one.
    granted_free_until     = COALESCE(NEW.free_until, pa.granted_free_until),
    stripe_customer_id     = COALESCE(EXCLUDED.stripe_customer_id, pa.stripe_customer_id),
    stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, pa.stripe_subscription_id),
    updated_at             = now();
  RETURN NEW;
END;
$function$;

-- Backfill every account whose future free_until never synced.
UPDATE public.personal_accounts pa
   SET granted_free_until = s.free_until,
       current_period_end = GREATEST(pa.current_period_end, s.free_until),
       status             = 'active',
       subscription_status = 'active',
       updated_at         = now()
  FROM public.subscriptions s
 WHERE s.user_id = pa.user_id
   AND s.free_until > now()
   AND (pa.granted_free_until IS NULL OR pa.granted_free_until < s.free_until);
