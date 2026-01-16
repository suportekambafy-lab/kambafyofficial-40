-- Expand MOZ exclusion list to remove all Angola payment methods from MOZ RPCs

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
  )
  INTO result
  FROM orders
  WHERE (
    (payment_method IN ('emola', 'mpesa', 'card_mz')
      OR currency = 'MZN'
      OR original_currency = 'MZN')
    AND COALESCE(LOWER(payment_method), '') NOT IN (
      'member_access',
      'express',
      'multicaixa_express',
      'reference',
      'bank_transfer',
      'transfer',
      'kambapay'
    )
  )
  AND (start_date IS NULL OR created_at >= start_date)
  AND (end_date IS NULL OR created_at <= end_date);

  RETURN result;
END;
$$;

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
        (payment_method IN ('emola', 'mpesa', 'card_mz')
          OR currency = 'MZN'
          OR original_currency = 'MZN')
        AND COALESCE(LOWER(payment_method), '') NOT IN (
          'member_access',
          'express',
          'multicaixa_express',
          'reference',
          'bank_transfer',
          'transfer',
          'kambapay'
        )
      )
    GROUP BY DATE(created_at)
  ) daily_data;

  RETURN result;
END;
$$;