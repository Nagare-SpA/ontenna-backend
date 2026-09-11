-- Harden the trial-expiry cron so it can never revoke an active comp grant.
-- Part 1 cancelled lapsed trialing subscriptions but ignored free_until: a
-- subscription still covered by an admin "free until" grant could be canceled,
-- which then propagated an inactive entitlement to personal_accounts. Add a
-- guard so any subscription with a future free_until is left untouched.
CREATE OR REPLACE FUNCTION public.expire_lapsed_trials()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 1. Stripe-less trial subscriptions whose trial window has passed AND that
  --    have no remaining admin free grant. The sync trigger mirrors the new
  --    status into personal_accounts.
  UPDATE public.subscriptions
     SET status = 'canceled', updated_at = now()
   WHERE status = 'trialing'
     AND trial_end IS NOT NULL
     AND trial_end < now()
     AND stripe_subscription_id IS NULL
     AND COALESCE(free_until, '-infinity'::timestamptz) < now();

  -- 2. personal_accounts rows seeded directly by signup (no subscription row)
  --    with no remaining entitlement date in the future.
  UPDATE public.personal_accounts
     SET subscription_status = 'expired', updated_at = now()
   WHERE subscription_status = 'trialing'
     AND COALESCE(trial_ends_at,      '-infinity'::timestamptz) < now()
     AND COALESCE(current_period_end,  '-infinity'::timestamptz) < now()
     AND COALESCE(granted_free_until,  '-infinity'::timestamptz) < now();
END;
$function$;
