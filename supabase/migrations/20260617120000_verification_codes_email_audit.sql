-- Auditability for verification-code emails -------------------------------
-- Record whether the email actually went out (and its Resend id) so a silent
-- send failure can never again look like a success.
ALTER TABLE public.verification_codes
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resend_id text;
