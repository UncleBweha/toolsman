
-- Drop permissive INSERT/UPDATE policies; keep public SELECT.
DROP POLICY IF EXISTS "Anyone can log a search" ON public.search_queries;
DROP POLICY IF EXISTS "Anyone can increment search count" ON public.search_queries;

-- Revoke direct writes; writes now flow through log_search_query() only.
REVOKE INSERT, UPDATE ON public.search_queries FROM anon, authenticated;
