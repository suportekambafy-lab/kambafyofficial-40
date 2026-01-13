-- Create RPC to get Mozambique admin stats (bypasses RLS)
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
     OR LOWER(customer_country) LIKE '%mozambique%'
     OR LOWER(customer_country) LIKE '%moçambique%';
  
  RETURN result;
END;
$$;

-- Create RPC to get Mozambique volume data for charts
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
        OR LOWER(customer_country) LIKE '%mozambique%'
        OR LOWER(customer_country) LIKE '%moçambique%'
      )
    GROUP BY DATE(created_at)
  ) daily_data;
  
  RETURN result;
END;
$$;