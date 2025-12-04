CREATE OR REPLACE FUNCTION public.get_total_revenue_stats()
RETURNS TABLE(total_revenue numeric, total_orders bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(SUM(amount::numeric), 0) as total_revenue,
    COUNT(*) as total_orders
  FROM orders 
  WHERE status = 'completed' 
    AND payment_method != 'member_access';
  -- Nota: transferências só chegam aqui com status='completed' após aprovação admin
  -- Ordens pendentes de transferência têm status='pending', não 'completed'
$$;