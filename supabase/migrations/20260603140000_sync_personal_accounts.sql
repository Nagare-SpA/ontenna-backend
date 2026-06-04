-- =====================================================
-- Keep personal_accounts (read by the iOS app) in sync with
-- the web's source of truth: public.subscriptions.
--
-- Any write to subscriptions (Stripe webhook, start-trial,
-- cancel, admin grant) mirrors into personal_accounts so the
-- app reflects real entitlement. status is left as 'active'
-- (reserved 'suspended' for admin bans); access is driven by
-- the date fields, exactly as the app expects.
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
    -- Subscription removed (e.g. trial/cancel deletes the row): revoke entitlement.
    UPDATE public.personal_accounts
       SET subscription_status = 'canceled',
           current_period_end  = NULL,
           trial_ends_at       = NULL,
           granted_free_until  = NULL,
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
    NEW.trial_end, NEW.current_period_end, NEW.free_until,
    NEW.stripe_customer_id, NEW.stripe_subscription_id, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan                   = EXCLUDED.plan,
    subscription_status    = EXCLUDED.subscription_status,
    trial_ends_at          = EXCLUDED.trial_ends_at,
    current_period_end     = EXCLUDED.current_period_end,
    granted_free_until     = EXCLUDED.granted_free_until,
    stripe_customer_id     = COALESCE(EXCLUDED.stripe_customer_id, pa.stripe_customer_id),
    stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, pa.stripe_subscription_id),
    updated_at             = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_personal_account_ins_upd ON public.subscriptions;
CREATE TRIGGER sync_personal_account_ins_upd
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_personal_account_from_subscription();

DROP TRIGGER IF EXISTS sync_personal_account_del ON public.subscriptions;
CREATE TRIGGER sync_personal_account_del
  AFTER DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_personal_account_from_subscription();

-- Backfill: mirror all existing subscriptions into personal_accounts now.
INSERT INTO public.personal_accounts AS pa (
  user_id, status, plan, subscription_status,
  trial_ends_at, current_period_end, granted_free_until,
  stripe_customer_id, stripe_subscription_id, updated_at
)
SELECT s.user_id, 'active', COALESCE(p.tier::text, 'trial'), s.status::text,
       s.trial_end, s.current_period_end, s.free_until,
       s.stripe_customer_id, s.stripe_subscription_id, now()
FROM public.subscriptions s
LEFT JOIN public.plans p ON p.id = s.plan_id
ON CONFLICT (user_id) DO UPDATE SET
  plan                   = EXCLUDED.plan,
  subscription_status    = EXCLUDED.subscription_status,
  trial_ends_at          = EXCLUDED.trial_ends_at,
  current_period_end     = EXCLUDED.current_period_end,
  granted_free_until     = EXCLUDED.granted_free_until,
  stripe_customer_id     = COALESCE(EXCLUDED.stripe_customer_id, pa.stripe_customer_id),
  stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, pa.stripe_subscription_id),
  updated_at             = now();
