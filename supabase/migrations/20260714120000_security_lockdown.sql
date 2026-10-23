-- =====================================================
-- SECURITY LOCKDOWN — closes two critical holes found in the
-- 2026-07 production-readiness audit:
--   (1) privilege escalation: self-signup could self-assign super_admin
--   (2) self-service entitlement: users could write their own subscriptions row
-- Also hardens the signup trigger so side-effects can never abort auth signup.
-- Safe to run on the live project; idempotent (DROP ... IF EXISTS / OR REPLACE).
-- =====================================================

-- 1) Remove user write access to billing tables. All subscription/billing
--    writes must go through service-role edge functions (stripe-webhook,
--    start-trial) — never the client.
DROP POLICY IF EXISTS "Users can create their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create their own billing events" ON public.billing_events;

-- 2) profiles UPDATE: add WITH CHECK so a user cannot re-point their row to
--    another id, and revoke UPDATE on privilege/verification columns so a user
--    cannot flip their own is_verified / account_type / active state.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

REVOKE UPDATE (id, email, account_type, is_verified, verification_status, is_active)
  ON public.profiles FROM authenticated;

-- 3) Harden the signup trigger:
--    - NEVER derive role/account_type from client-supplied metadata (self-signup
--      is always 'end_user'; elevate roles only via the super-admin-gated
--      user_roles policies or a service-role admin path).
--    - Wrap in an exception guard + ON CONFLICT so a profile/role hiccup can
--      never abort the auth.users INSERT (which would break signup entirely).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, mother_user_id, account_type, first_name, last_name
  )
  VALUES (
    NEW.id,
    lower(NEW.email),
    NEW.raw_user_meta_data ->> 'mother_user_id',
    'end_user',                              -- hardcoded: never trust client metadata
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'end_user')               -- hardcoded default role
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let a side-effect failure abort signup; surface it in logs instead.
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
