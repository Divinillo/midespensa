-- ─────────────────────────────────────────────────────────────────
-- MiDespensa — Google Play Billing support
-- Adds two columns to the licencias table so we can track Play
-- subscriptions alongside Stripe subscriptions in the same row.
--
-- Run this in Supabase → SQL Editor before deploying the
-- play-verify-purchase / play-billing-webhook endpoints.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE licencias
  ADD COLUMN IF NOT EXISTS play_product_id TEXT,
  ADD COLUMN IF NOT EXISTS play_expiry     TIMESTAMPTZ;

-- Speeds up the RTDN webhook lookup by purchaseToken
-- (stored as session_id = 'play:<token>').
CREATE INDEX IF NOT EXISTS idx_licencias_session_id
  ON licencias (session_id);
