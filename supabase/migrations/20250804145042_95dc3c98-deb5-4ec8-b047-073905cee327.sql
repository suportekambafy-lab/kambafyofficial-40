-- Fix critical security issues found by linter (Phase 1)

-- 1. Fix Security Definer View issue
-- Remove potentially unsafe views and recreate with proper security
DROP VIEW IF EXISTS admin_dashboard_stats;

-- 2. Fix get_current_user_email function with proper search_path
DROP FUNCTION IF EXISTS get_current_user_email();
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'suporte@kambafy.com'  -- Fallback para admin
  );
END;
$$;

-- 3. Fix get_seller_stats function with proper search_path
DROP FUNCTION IF EXISTS get_seller_stats(uuid);
CREATE OR REPLACE FUNCTION get_seller_stats(seller_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Ensure user can only access their own stats
  IF auth.uid() != seller_user_id THEN
    RAISE EXCEPTION 'Access denied: Can only access own statistics';
  END IF;

  RETURN json_build_object(
    'totalSales', COALESCE(
      (SELECT COUNT(*) FROM orders WHERE user_id = seller_user_id AND status = 'completed'), 0
    ),
    'totalRevenue', COALESCE(
      (SELECT SUM(amount::numeric) FROM orders WHERE user_id = seller_user_id AND status = 'completed'), 0
    ),
    'totalProducts', COALESCE(
      (SELECT COUNT(*) FROM products WHERE user_id = seller_user_id), 0
    ),
    'totalCustomers', COALESCE(
      (SELECT COUNT(DISTINCT customer_email) FROM orders WHERE user_id = seller_user_id AND status = 'completed'), 0
    ),
    'recentOrders', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'id', id,
          'amount', amount,
          'customer_name', customer_name,
          'created_at', created_at
        ) ORDER BY created_at DESC
      ) FROM (
        SELECT id, amount, customer_name, created_at 
        FROM orders 
        WHERE user_id = seller_user_id AND status = 'completed'
        ORDER BY created_at DESC 
        LIMIT 5
      ) recent), '[]'::json
    ),
    'monthlyStats', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'month', month_start,
          'sales', sales_count,
          'revenue', total_revenue
        ) ORDER BY month_start
      ) FROM (
        SELECT 
          date_trunc('month', created_at) as month_start,
          COUNT(*) as sales_count,
          SUM(amount::numeric) as total_revenue
        FROM orders 
        WHERE user_id = seller_user_id 
          AND status = 'completed'
          AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '11 months')
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      ) monthly), '[]'::json
    )
  );
END;
$$;

-- 4. Create secure function for admin dashboard stats with proper search_path
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS json
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

  RETURN json_build_object(
    'total_users', (SELECT COUNT(*)::bigint FROM auth.users),
    'total_products', (SELECT COUNT(*)::bigint FROM products WHERE admin_approved = true),
    'total_transactions', (SELECT COUNT(*)::bigint FROM orders WHERE status = 'completed'),
    'pending_withdrawals', (SELECT COUNT(*)::bigint FROM withdrawal_requests WHERE status = 'pendente'),
    'total_paid_out', (SELECT COALESCE(SUM(amount), 0) FROM withdrawal_requests WHERE status = 'aprovado')
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION get_seller_stats(uuid) TO authenticated;