-- =====================================================
-- Auto-expire lapsed free trials (daily cron).
-- Entitlement is already date-driven (the app/dashboard grant access only
-- while a date is in the future), so this is housekeeping: it flips stale
-- 'trialing' rows to a terminal status so reporting/UX is accurate.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.expire_lapsed_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Stripe-less trial subscriptions whose trial window has passed.
  --    The sync trigger mirrors the new status into personal_accounts.
  UPDATE public.subscriptions
     SET status = 'canceled', updated_at = now()
   WHERE status = 'trialing'
     AND trial_end IS NOT NULL
     AND trial_end < now()
     AND stripe_subscription_id IS NULL;

  -- 2. personal_accounts rows seeded directly by signup (no subscription row)
  --    that have no remaining entitlement date in the future.
  UPDATE public.personal_accounts
     SET subscription_status = 'expired', updated_at = now()
   WHERE subscription_status = 'trialing'
     AND COALESCE(trial_ends_at,      '-infinity'::timestamptz) < now()
     AND COALESCE(current_period_end,  '-infinity'::timestamptz) < now()
     AND COALESCE(granted_free_until,  '-infinity'::timestamptz) < now();
END;
$$;

-- Schedule daily at 03:15 UTC (idempotent: unschedule any prior job first).
DO $$
BEGIN
  PERFORM cron.unschedule('expire-lapsed-trials')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-lapsed-trials');
  PERFORM cron.schedule('expire-lapsed-trials', '15 3 * * *', $cmd$SELECT public.expire_lapsed_trials();$cmd$);
END $$;
