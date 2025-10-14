
-- Função para buscar os top 3 vendedores do mês atual
CREATE OR REPLACE FUNCTION public.get_top_sellers_of_month()
RETURNS TABLE (
  full_name TEXT,
  avatar_url TEXT,
  total_sales BIGINT,
  total_revenue NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.full_name,
    p.avatar_url,
    COUNT(DISTINCT o.id) as total_sales,
    SUM(o.amount::numeric) as total_revenue
  FROM profiles p
  INNER JOIN orders o ON p.user_id = o.user_id
  WHERE o.status = 'completed'
    AND o.created_at >= date_trunc('month', CURRENT_DATE)
    AND o.created_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
  GROUP BY p.user_id, p.full_name, p.avatar_url
  ORDER BY total_sales DESC
  LIMIT 3;
$$;
