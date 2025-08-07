-- Função otimizada para estatísticas do vendedor
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
          'month', date_trunc('month', created_at),
          'sales', COUNT(*),
          'revenue', SUM(amount::numeric)
        )
      ) FROM (
        SELECT created_at, amount
        FROM orders 
        WHERE user_id = seller_id 
          AND status = 'completed'
          AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '11 months')
        GROUP BY date_trunc('month', created_at), amount
        ORDER BY date_trunc('month', created_at)
      ) monthly), '[]'::json
    )
  );
$$;

-- Índices otimizados para performance
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created 
ON orders(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_completed 
ON orders(user_id) WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_products_user_created 
ON products(user_id, created_at DESC);

-- Índice para busca rápida de emails únicos
CREATE INDEX IF NOT EXISTS idx_orders_customer_email_user_status 
ON orders(customer_email, user_id) WHERE status = 'completed';