-- Função otimizada para estatísticas do vendedor (corrigida)
CREATE OR REPLACE FUNCTION get_seller_stats(seller_id UUID)
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'totalSales', COALESCE(
      (SELECT COUNT(*) FROM orders WHERE user_id = seller_id AND status = 'completed'), 0
    ),
    'totalRevenue', COALESCE(
      (SELECT SUM(amount::numeric) FROM orders WHERE user_id = seller_id AND status = 'completed'), 0
    ),
    'totalProducts', COALESCE(
      (SELECT COUNT(*) FROM products WHERE user_id = seller_id), 0
    ),
    'totalCustomers', COALESCE(
      (SELECT COUNT(DISTINCT customer_email) FROM orders WHERE user_id = seller_id AND status = 'completed'), 0
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
        WHERE user_id = seller_id AND status = 'completed'
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
        WHERE user_id = seller_id 
          AND status = 'completed'
          AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '11 months')
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      ) monthly), '[]'::json
    )
  );
$$;