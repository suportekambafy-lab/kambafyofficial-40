-- Fix the view security issue - use SECURITY INVOKER instead
DROP VIEW IF EXISTS public.admin_users_safe;

CREATE VIEW public.admin_users_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
FROM public.admin_users;

-- Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.admin_users_safe TO authenticated;