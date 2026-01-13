-- Update get_mozambique_admin_stats to accept date range parameters
CREATE OR REPLACE FUNCTION public.get_mozambique_admin_stats(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
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
  WHERE (
    payment_method IN ('emola', 'mpesa', 'card_mz')
    OR currency = 'MZN'
    OR original_currency = 'MZN'
  )
  AND (start_date IS NULL OR created_at >= start_date)
  AND (end_date IS NULL OR created_at <= end_date);
  
  RETURN result;
END;
$$;