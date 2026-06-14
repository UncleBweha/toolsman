
-- Drop broad SELECT policies on public buckets (files remain accessible via public URLs)
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view system assets" ON storage.objects;

-- Revoke EXECUTE on SECURITY DEFINER functions from public roles.
-- Trigger functions don't need EXECUTE grants; has_role is invoked inside RLS policies which run as table owner.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_admin_role_assignment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
-- Keep authenticated EXECUTE on has_role since some client code may call it; but if not needed, revoke too.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
