
-- ✅ Correção: Popular user_id nas orders antigas baseado no product_id
-- Isso garante consistência futura e permite queries diretas por user_id

UPDATE orders o
SET user_id = p.user_id
FROM products p
WHERE o.product_id = p.id
  AND o.user_id IS NULL;

-- Criar índice para melhorar performance das queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_product_user ON orders(product_id, user_id);

-- Log do resultado
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM orders
  WHERE user_id IS NOT NULL AND product_id IS NOT NULL;
  
  RAISE NOTICE '✅ Migration concluída. Total de orders com user_id: %', updated_count;
END $$;
