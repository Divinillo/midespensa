-- ─────────────────────────────────────────────────────────────────
-- MiDespensa — Rate limiting table
-- Run this in Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT         PRIMARY KEY,
  count        INTEGER      NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Only the service key (backend) can read/write this table
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No public policies — service key bypasses RLS

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_start);

-- Optional: auto-clean entries older than 1 hour to keep table small
-- (run via pg_cron or manually if not available)
-- DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
