-- =====================================================
-- ENTITLEMENT SYNC FIX — from the 2026-07 audit.
-- The old sync clobbered personal_accounts.granted_free_until with
-- subscriptions.free_until on every write, and NULLed it on subscription
-- DELETE — silently revoking standing complimentary grants.
--
-- granted_free_until is now treated as an ADMIN-OWNED comp field:
--   - INSERT/UPDATE from a subscription no longer overwrites it
--   - DELETE of a subscription no longer clears it
-- (The mobile-me / mobile-subscription functions read BOTH subscriptions.free_until
--  and personal_accounts.granted_free_until when computing access, so the two comp
--  fields are independent and neither is lost.)
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_personal_account_from_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    -- Revoke the subscription-derived entitlement, but PRESERVE the admin comp.
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
    trial_ends_at, current_period_end,
    stripe_customer_id, stripe_subscription_id, updated_at
  )
  VALUES (
    NEW.user_id, 'active', COALESCE(v_tier, 'trial'), NEW.status::text,
    NEW.trial_end, NEW.current_period_end,
    NEW.stripe_customer_id, NEW.stripe_subscription_id, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan                   = EXCLUDED.plan,
    subscription_status    = EXCLUDED.subscription_status,
    trial_ends_at          = EXCLUDED.trial_ends_at,
    current_period_end     = EXCLUDED.current_period_end,
    -- granted_free_until intentionally NOT touched (admin-owned comp grant).
    stripe_customer_id     = COALESCE(EXCLUDED.stripe_customer_id, pa.stripe_customer_id),
    stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, pa.stripe_subscription_id),
    updated_at             = now();
  RETURN NEW;
END;
$$;
