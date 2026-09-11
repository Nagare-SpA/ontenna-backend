-- Automatic 30-day free trial for every new account ------------------------
-- Any account (web, mobile, or admin-created) gets a 30-day trialing
-- subscription on the active "pro" plan. Runs after handle_new_user so the
-- profile already exists; the subscriptions -> personal_accounts sync trigger
-- then reflects it for the iOS app.

CREATE OR REPLACE FUNCTION public.grant_signup_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_now timestamptz := now();
  v_end timestamptz := now() + interval '30 days';
BEGIN
  -- Don't duplicate if a subscription already exists for this user.
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_plan_id
  FROM public.plans
  WHERE tier = 'pro' AND is_active = true
  ORDER BY price_monthly
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN NEW; -- no plan configured; skip silently
  END IF;

  INSERT INTO public.subscriptions (
    user_id, plan_id, status,
    current_period_start, current_period_end,
    trial_start, trial_end,
    cancel_at_period_end, admin_notes
  ) VALUES (
    NEW.id, v_plan_id, 'trialing',
    v_now, v_end,
    v_now, v_end,
    false, 'Auto 30-day trial on signup'
  );

  -- Mark the trial as consumed so the manual "start trial" path won't re-grant.
  UPDATE public.profiles SET has_used_trial = true WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Name sorts after "on_auth_user_created" so it runs after the profile is made.
DROP TRIGGER IF EXISTS on_auth_user_created_trial ON auth.users;
CREATE TRIGGER on_auth_user_created_trial
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_signup_trial();
