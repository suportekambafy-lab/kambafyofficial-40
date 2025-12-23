-- Adicionar campos para rastrear quem processou cada ação (para super admins verem)

-- 1. Refund requests - adicionar campo processed_by_admin_id
ALTER TABLE refund_requests 
ADD COLUMN IF NOT EXISTS processed_by_admin_id uuid REFERENCES admin_users(id),
ADD COLUMN IF NOT EXISTS processed_by_admin_name text;

-- 2. Products - adicionar campo para rastrear quem aprovou/baniu
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS approved_by_admin_id uuid REFERENCES admin_users(id),
ADD COLUMN IF NOT EXISTS approved_by_admin_name text,
ADD COLUMN IF NOT EXISTS banned_by_admin_id uuid REFERENCES admin_users(id),
ADD COLUMN IF NOT EXISTS banned_by_admin_name text;

-- 3. Orders - adicionar campo para rastrear quem aprovou pagamento (transferência)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS approved_by_admin_id uuid REFERENCES admin_users(id),
ADD COLUMN IF NOT EXISTS approved_by_admin_name text;

-- Comentários explicativos
COMMENT ON COLUMN refund_requests.processed_by_admin_id IS 'ID do admin que processou o reembolso';
COMMENT ON COLUMN refund_requests.processed_by_admin_name IS 'Nome do admin que processou o reembolso (cache)';
COMMENT ON COLUMN products.approved_by_admin_id IS 'ID do admin que aprovou o produto';
COMMENT ON COLUMN products.approved_by_admin_name IS 'Nome do admin que aprovou (cache)';
COMMENT ON COLUMN products.banned_by_admin_id IS 'ID do admin que baniu o produto';
COMMENT ON COLUMN products.banned_by_admin_name IS 'Nome do admin que baniu (cache)';
COMMENT ON COLUMN orders.approved_by_admin_id IS 'ID do admin que aprovou o pagamento';
COMMENT ON COLUMN orders.approved_by_admin_name IS 'Nome do admin que aprovou (cache)';