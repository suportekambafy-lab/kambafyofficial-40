
-- Corrigir pedidos duplicados existentes
-- Manter apenas o pedido mais antigo de cada grupo de duplicados

WITH duplicated_orders AS (
  SELECT 
    o1.id,
    o1.order_id,
    o1.customer_email,
    o1.product_id,
    o1.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY o1.customer_email, o1.product_id, 
                   DATE_TRUNC('minute', o1.created_at)
      ORDER BY o1.created_at ASC
    ) as row_num
  FROM orders o1
  WHERE o1.status = 'pending'
    AND o1.created_at >= NOW() - INTERVAL '30 days'
)
DELETE FROM orders
WHERE id IN (
  SELECT id FROM duplicated_orders WHERE row_num > 1
);

-- Log dos pedidos removidos
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Removidos % pedidos duplicados', deleted_count;
END $$;
