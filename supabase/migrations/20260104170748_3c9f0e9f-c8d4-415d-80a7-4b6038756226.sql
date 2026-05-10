-- Create trigger function to auto-assign admin role for specific email
CREATE OR REPLACE FUNCTION public.handle_admin_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'admin@toolsman.co.ke' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to run after user creation
DROP TRIGGER IF EXISTS on_auth_user_created_admin_role ON auth.users;
CREATE TRIGGER on_auth_user_created_admin_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_role_assignment();