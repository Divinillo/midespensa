-- ─────────────────────────────────────────────────────────────────
-- MiDespensa — RLS verification & hardening script
-- Run in Supabase → SQL Editor to confirm no public data exposure
-- ─────────────────────────────────────────────────────────────────

-- 1. Verify RLS is enabled on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Expected: rls_enabled = true for ALL tables

-- 2. List all existing RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- Expected: NO policies with roles = {anon} or roles = {authenticated}
-- that allow SELECT/ALL on licencias, despensa_data, or rate_limits.
-- Only service_role bypasses RLS (it's exempt by design).

-- 3. Confirm the anon role has no table-level grants on sensitive tables
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;
-- Note: Supabase grants SELECT/INSERT/UPDATE/DELETE to anon and authenticated
-- at the PostgreSQL level, but RLS policies (deny-by-default) block actual
-- access when no ALLOW policy exists. Having no RLS policy = no access.

-- 4. Harden: explicitly revoke table-level grants from anon on sensitive tables
--    (belt-and-suspenders — RLS already blocks access, but this removes the grants too)
REVOKE ALL ON licencias    FROM anon;
REVOKE ALL ON despensa_data FROM anon;
REVOKE ALL ON rate_limits   FROM anon;

-- 5. Also revoke from authenticated role (all DB access goes via service key)
REVOKE ALL ON licencias    FROM authenticated;
REVOKE ALL ON despensa_data FROM authenticated;
REVOKE ALL ON rate_limits   FROM authenticated;

-- After running steps 4-5, re-check grants (step 3) — the sensitive tables
-- should no longer appear for anon or authenticated roles.
-- The Supabase JS client (anon key) will only be able to call auth endpoints.
