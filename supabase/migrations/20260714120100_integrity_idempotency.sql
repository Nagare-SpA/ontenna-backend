-- =====================================================
-- INTEGRITY & IDEMPOTENCY — from the 2026-07 audit.
--   - Stripe webhook idempotency (dedup + UNIQUE on stripe_event_id)
--   - profiles email uniqueness (guarded; skips if dupes exist)
--   - verification_codes brute-force counter + retention cleanup
-- Idempotent and safe to re-run.
-- =====================================================

-- 1) billing_events: dedupe then enforce one row per Stripe event id.
DELETE FROM public.billing_events a
USING public.billing_events b
WHERE a.ctid < b.ctid
  AND a.stripe_event_id = b.stripe_event_id
  AND a.stripe_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS billing_events_stripe_event_id_key
  ON public.billing_events (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

-- 2) profiles: case-insensitive email uniqueness. Only create the index if the
--    data is already clean, so this migration never hard-fails on legacy dupes.
DO $do$
BEGIN
  IF (SELECT count(*) FROM (
        SELECT lower(email) e FROM public.profiles GROUP BY 1 HAVING count(*) > 1
      ) d) = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower
      ON public.profiles (lower(email));
  ELSE
    RAISE WARNING 'profiles has duplicate emails; unique index skipped — deduplicate then create idx_profiles_email_lower manually.';
  END IF;
END
$do$;

-- 3) verification_codes: brute-force attempt counter (used by verify-code /
--    mobile-verify-email to invalidate a code after N wrong guesses).
ALTER TABLE public.verification_codes
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

-- 4) verification_codes retention: purge used/expired codes daily so this
--    auth-secret + PII table does not grow unbounded (GDPR data-minimization).
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.schedule(
      'verification_codes_cleanup',
      '17 3 * * *',
      $job$DELETE FROM public.verification_codes WHERE used = true OR expires_at < now() - interval '1 day';$job$
    );
  ELSE
    RAISE WARNING 'pg_cron not available; schedule verification_codes cleanup via the dashboard.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pg_cron setup skipped: %', SQLERRM;
END
$do$;
