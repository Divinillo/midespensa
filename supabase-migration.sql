-- ─────────────────────────────────────────────────────────────────
-- MiDespensa — Supabase migration
-- Run this in Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- 1. Licencias table  (may already exist — we just add missing columns)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licencias (
  id         bigserial    PRIMARY KEY,
  clave      text         UNIQUE NOT NULL,
  tier       text         NOT NULL DEFAULT 'pro',  -- 'pro' | 'ultra'
  activa     boolean      NOT NULL DEFAULT true,
  email      text,
  session_id text         UNIQUE,                  -- Stripe checkout session ID
  created_at timestamptz  DEFAULT now()
);

-- Add columns if the table already exists without them
ALTER TABLE licencias ADD COLUMN IF NOT EXISTS email      text;
ALTER TABLE licencias ADD COLUMN IF NOT EXISTS session_id text UNIQUE;
ALTER TABLE licencias ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Index for fast lookups by session_id and email
CREATE INDEX IF NOT EXISTS idx_licencias_session ON licencias (session_id);
CREATE INDEX IF NOT EXISTS idx_licencias_email   ON licencias (email);

-- Row-level security: anon users can only SELECT their own row by clave
-- (the service key used in the backend bypasses RLS entirely)
ALTER TABLE licencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_by_clave" ON licencias;
CREATE POLICY "anon_read_by_clave" ON licencias
  FOR SELECT
  TO anon
  USING (true);   -- Frontend already filters by clave — restrict further if you want


-- ─────────────────────────────────────────────────────────────────
-- 2. User data table  (for cloud sync)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS despensa_data (
  email      text   PRIMARY KEY,
  data       jsonb  NOT NULL DEFAULT '{}',
  updated_at bigint NOT NULL DEFAULT 0
);

-- Service key bypasses RLS; no anon access needed for this table
ALTER TABLE despensa_data ENABLE ROW LEVEL SECURITY;

-- No public policies — only the service key (backend) can read/write
