-- Criar índices otimizados para performance
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created 
ON orders(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_completed 
ON orders(user_id) WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_products_user_created 
ON products(user_id, created_at DESC);

-- Índice para busca rápida de emails únicos
CREATE INDEX IF NOT EXISTS idx_orders_customer_email_user_status 
ON orders(customer_email, user_id) WHERE status = 'completed';