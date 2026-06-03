-- =====================================================
-- Free Trial support
-- Tracks whether an account has already used its one-time
-- 1-month free trial. Enforced server-side by the
-- `start-trial` edge function.
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.has_used_trial IS
  'True once the account has consumed its one-time free trial. Set by the start-trial edge function.';
