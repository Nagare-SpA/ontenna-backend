-- Apple In-App Purchase entitlement mapping ---------------------------------
-- Maps an Apple originalTransactionId to our user, so both the post-purchase
-- endpoint and the App Store Server Notifications V2 webhook can resolve which
-- account to update in personal_accounts.
CREATE TABLE IF NOT EXISTS public.app_store_transactions (
  original_transaction_id text PRIMARY KEY,
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id              text,
  latest_transaction_id   text,
  expires_at              timestamptz,
  status                  text,          -- active | expired | grace | revoked | refunded
  environment             text,          -- Sandbox | Production
  raw                     jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ast_user_idx ON public.app_store_transactions(user_id);

ALTER TABLE public.app_store_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ast_read_own ON public.app_store_transactions;
CREATE POLICY ast_read_own ON public.app_store_transactions
  FOR SELECT USING (auth.uid() = user_id);
-- Writes happen only from edge functions using the service role (bypasses RLS).
