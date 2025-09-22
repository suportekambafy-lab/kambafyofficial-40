-- Fix the admin_dashboard_stats view security issue
-- The view was owned by postgres which creates security definer behavior

-- Drop the existing view
DROP VIEW IF EXISTS public.admin_dashboard_stats;

-- Recreate the view with proper ownership and access controls
-- Instead of a view, create a security definer function that checks admin access
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(
  total_users bigint,
  total_products bigint, 
  total_transactions bigint,
  pending_withdrawals bigint,
  total_paid_out numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Return the dashboard stats
  RETURN QUERY
  SELECT 
    ( SELECT count(*) FROM profiles)::bigint AS total_users,
    ( SELECT count(*) FROM products WHERE products.status = 'Ativo'::text)::bigint AS total_products,
    ( SELECT count(*) FROM orders WHERE orders.status = 'completed'::text)::bigint AS total_transactions,
    ( SELECT count(*) FROM withdrawal_requests WHERE withdrawal_requests.status = 'pendente'::text)::bigint AS pending_withdrawals,
    ( SELECT COALESCE(sum(withdrawal_requests.amount), 0::numeric) FROM withdrawal_requests WHERE withdrawal_requests.status = 'aprovado'::text) AS total_paid_out;
END;
$function$;

-- Grant execute permission to authenticated users (the function itself will check admin access)
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;