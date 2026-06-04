-- =====================================================
-- personal_accounts
-- Entitlement table expected by the Ontenna iOS app.
-- It lived in the old (now-deleted) Supabase project; this
-- recreates it in the live project (ycfrjvnuepfkeffsqxgm).
--
-- NOTE: a trigger named `on_auth_user_created` already exists
-- on auth.users (it creates profiles + roles). We DO NOT touch
-- it — we add a separate trigger so user signup keeps working.
-- =====================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS public.personal_accounts (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status                TEXT NOT NULL DEFAULT 'active',
  plan                  TEXT NOT NULL DEFAULT 'trial',
  subscription_status   TEXT,
  payment_provider      TEXT,
  trial_started_at      TIMESTAMPTZ,
  trial_ends_at         TIMESTAMPTZ,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  granted_free_until    TIMESTAMPTZ,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. RLS — each user reads only their own row
ALTER TABLE public.personal_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own personal account" ON public.personal_accounts;
CREATE POLICY "Users can view their own personal account"
  ON public.personal_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all personal accounts" ON public.personal_accounts;
CREATE POLICY "Super admins can view all personal accounts"
  ON public.personal_accounts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- (writes happen via SECURITY DEFINER trigger and service_role edge functions,
--  both of which bypass RLS — no INSERT/UPDATE policy for end users by design.)

-- 3. updated_at trigger
DROP TRIGGER IF EXISTS update_personal_accounts_updated_at ON public.personal_accounts;
CREATE TRIGGER update_personal_accounts_updated_at
  BEFORE UPDATE ON public.personal_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. On signup: create the personal_account with a 30-day trial.
--    Separate function + trigger name so we never clobber handle_new_user().
CREATE OR REPLACE FUNCTION public.handle_new_personal_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.personal_accounts (
    user_id, status, plan, subscription_status,
    trial_started_at, trial_ends_at
  )
  VALUES (
    NEW.id, 'active', 'trial', 'trialing',
    now(), now() + interval '30 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_personal_account ON auth.users;
CREATE TRIGGER on_auth_user_created_personal_account
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_personal_account();

-- 5. Backfill existing users with a fresh 30-day trial
INSERT INTO public.personal_accounts (
  user_id, status, plan, subscription_status, trial_started_at, trial_ends_at
)
SELECT u.id, 'active', 'trial', 'trialing', now(), now() + interval '30 days'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.personal_accounts pa WHERE pa.user_id = u.id
);
