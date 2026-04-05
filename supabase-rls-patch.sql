-- ─────────────────────────────────────────────────────────────────
-- MiDespensa — RLS security patch
-- Run this in Supabase → SQL Editor to remove the overly permissive
-- anon read policy on the licencias table.
--
-- Background: the previous policy USING(true) allowed any anonymous
-- user to enumerate all license keys. License tier lookups are now
-- handled server-side by the /api/sync-data Cloudflare Function using
-- the service key (which bypasses RLS), so no client-side direct
-- access to licencias is needed.
-- ─────────────────────────────────────────────────────────────────

-- Remove permissive anon read policy
DROP POLICY IF EXISTS "anon_read_by_clave" ON licencias;

-- Verify: no remaining policies on licencias should be present
-- (service key bypasses RLS entirely, authenticated users have no need
-- to query licencias directly)
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'licencias';
