-- Fix critical security issues found by linter

-- 1. Fix Security Definer View issue
-- Remove potentially unsafe views and recreate with proper security
DROP VIEW IF EXISTS admin_dashboard_stats;

-- 2. Create secure function for admin dashboard stats with proper search_path
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_users bigint,
  total_products bigint,
  total_transactions bigint,
  pending_withdrawals bigint,
  total_paid_out numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Only allow admin users to access this function
  IF NOT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::bigint FROM auth.users) as total_users,
    (SELECT COUNT(*)::bigint FROM products WHERE admin_approved = true) as total_products,
    (SELECT COUNT(*)::bigint FROM orders WHERE status = 'completed') as total_transactions,
    (SELECT COUNT(*)::bigint FROM withdrawal_requests WHERE status = 'pendente') as pending_withdrawals,
    (SELECT COALESCE(SUM(amount), 0) FROM withdrawal_requests WHERE status = 'aprovado') as total_paid_out;
END;
$$;

-- 3. Fix get_current_user_email function with proper search_path
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$;

-- 4. Fix get_seller_stats function with proper search_path
CREATE OR REPLACE FUNCTION get_seller_stats(seller_user_id uuid)
RETURNS TABLE (
  total_products bigint,
  total_sales bigint,
  total_revenue numeric,
  pending_withdrawals numeric,
  available_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Ensure user can only access their own stats
  IF auth.uid() != seller_user_id THEN
    RAISE EXCEPTION 'Access denied: Can only access own statistics';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::bigint FROM products WHERE user_id = seller_user_id) as total_products,
    (SELECT COUNT(*)::bigint FROM orders o 
     JOIN products p ON o.product_id = p.id 
     WHERE p.user_id = seller_user_id AND o.status = 'completed') as total_sales,
    (SELECT COALESCE(SUM(o.amount::numeric), 0) FROM orders o 
     JOIN products p ON o.product_id = p.id 
     WHERE p.user_id = seller_user_id AND o.status = 'completed') as total_revenue,
    (SELECT COALESCE(SUM(amount), 0) FROM withdrawal_requests 
     WHERE user_id = seller_user_id AND status = 'pendente') as pending_withdrawals,
    (SELECT COALESCE(
      (SELECT SUM(o.amount::numeric) FROM orders o 
       JOIN products p ON o.product_id = p.id 
       WHERE p.user_id = seller_user_id AND o.status = 'completed') - 
      (SELECT COALESCE(SUM(amount), 0) FROM withdrawal_requests 
       WHERE user_id = seller_user_id AND status IN ('pendente', 'aprovado')), 0
    )) as available_balance;
END;
$$;

-- 5. Enable RLS on admin_dashboard_stats if it exists as table
-- (Note: We're using function instead, but ensuring no table exists without RLS)

-- Grant execute permission to authenticated users for the functions
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION get_seller_stats(uuid) TO authenticated;