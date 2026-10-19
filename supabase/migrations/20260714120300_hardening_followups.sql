-- =====================================================
-- HARDENING FOLLOW-UPS (P2) — 2026-07 audit
--   - exception guards on the remaining two signup triggers
--   - login_attempts table for mobile-login lockout
--   - transactional account-deletion RPC (public-schema cascade in one tx)
-- Idempotent.
-- =====================================================

-- 1) Guard handle_new_personal_account so it can never abort auth signup.
CREATE OR REPLACE FUNCTION public.handle_new_personal_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.personal_accounts (
    user_id, status, plan, subscription_status, trial_started_at, trial_ends_at
  )
  VALUES (NEW.id, 'active', 'trial', 'trialing', now(), now() + interval '30 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_personal_account failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 2) Guard grant_signup_trial too.
CREATE OR REPLACE FUNCTION public.grant_signup_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_now timestamptz := now();
  v_end timestamptz := now() + interval '30 days';
BEGIN
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_plan_id FROM public.plans
  WHERE tier = 'pro' AND is_active = true ORDER BY price_monthly LIMIT 1;
  IF v_plan_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.subscriptions (
    user_id, plan_id, status, current_period_start, current_period_end,
    trial_start, trial_end, cancel_at_period_end, admin_notes
  ) VALUES (
    NEW.id, v_plan_id, 'trialing', v_now, v_end, v_now, v_end, false, 'Auto 30-day trial on signup'
  );
  UPDATE public.profiles SET has_used_trial = true WHERE id = NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'grant_signup_trial failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 3) Login lockout store (written only by the service role in mobile-login).
CREATE TABLE IF NOT EXISTS public.login_attempts (
  email        TEXT PRIMARY KEY,
  attempts     INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
-- No policies: end users get zero access; service_role (mobile-login) bypasses RLS.

-- 4) Transactional public-schema cascade for account deletion. Runs in one
--    transaction so a partial failure rolls back. auth.users itself is removed
--    by the edge function via the Admin API after this succeeds.
CREATE OR REPLACE FUNCTION public.delete_user_data(target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.billing_events     WHERE user_id = target;
  DELETE FROM public.subscriptions      WHERE user_id = target;
  DELETE FROM public.user_roles         WHERE user_id = target;
  DELETE FROM public.verification_codes WHERE user_id = target;
  DELETE FROM public.login_attempts     WHERE email = (SELECT email FROM public.profiles WHERE id = target);
  DELETE FROM public.personal_accounts  WHERE user_id = target;
  DELETE FROM public.profiles           WHERE id = target;
END;
$$;
