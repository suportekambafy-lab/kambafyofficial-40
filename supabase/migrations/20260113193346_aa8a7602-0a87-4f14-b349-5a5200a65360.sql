-- Fix get_mozambique_admin_stats: Remove customer_country filter, use only MZN/MZ payment methods
CREATE OR REPLACE FUNCTION public.get_mozambique_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalOrders', COALESCE(COUNT(*), 0),
    'totalRevenue', COALESCE(SUM(CASE WHEN status = 'completed' THEN CAST(amount AS DECIMAL) ELSE 0 END), 0),
    'completedOrders', COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0),
    'pendingOrders', COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0)
  ) INTO result
  FROM orders
  WHERE payment_method IN ('emola', 'mpesa', 'card_mz')
     OR currency = 'MZN'
     OR original_currency = 'MZN';
  
  RETURN result;
END;
$$;

-- Fix get_mozambique_volume_data: Remove customer_country filter, use only MZN/MZ payment methods
CREATE OR REPLACE FUNCTION public.get_mozambique_volume_data(days_back INTEGER DEFAULT 7)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(daily_data ORDER BY date), '[]'::json) INTO result
  FROM (
    SELECT 
      DATE(created_at) as date,
      COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as volume,
      COUNT(*) as count
    FROM orders
    WHERE status = 'completed'
      AND created_at >= NOW() - (days_back || ' days')::INTERVAL
      AND (
        payment_method IN ('emola', 'mpesa', 'card_mz')
        OR currency = 'MZN'
        OR original_currency = 'MZN'
      )
    GROUP BY DATE(created_at)
  ) daily_data;
  
  RETURN result;
END;
$$;