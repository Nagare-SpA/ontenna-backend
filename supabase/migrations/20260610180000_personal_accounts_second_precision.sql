-- =====================================================
-- personal_accounts: store entitlement timestamps at SECOND precision.
-- The iOS app decodes these dates with a strict ISO8601 decoder that fails
-- on sub-second fractions (e.g. "...T17:27:04.641+00:00"). A failed Date
-- decode makes the whole row fail → the app shows "subscription inactive"
-- even when entitlement is valid. timestamptz(0) makes PostgREST emit
-- fraction-less timestamps ("...T17:27:05+00:00"), which decode cleanly.
-- (App should also adopt a lenient date decoder, but this unblocks without
--  an app release and is harmless for entitlement, which is per-second.)
-- =====================================================

ALTER TABLE public.personal_accounts
  ALTER COLUMN trial_started_at     TYPE timestamptz(0),
  ALTER COLUMN trial_ends_at        TYPE timestamptz(0),
  ALTER COLUMN current_period_start TYPE timestamptz(0),
  ALTER COLUMN current_period_end   TYPE timestamptz(0),
  ALTER COLUMN granted_free_until   TYPE timestamptz(0),
  ALTER COLUMN created_at           TYPE timestamptz(0),
  ALTER COLUMN updated_at           TYPE timestamptz(0);
