-- Limpar transações sale_revenue incorretas (vendas com menos de 3 dias)
-- Estas transações foram criadas imediatamente em vez de esperar 3 dias

-- Deletar sale_revenue de vendas com menos de 3 dias
DELETE FROM balance_transactions
WHERE type = 'sale_revenue'
  AND order_id IN (
    SELECT order_id 
    FROM orders 
    WHERE status = 'completed' 
      AND created_at > NOW() - INTERVAL '3 days'
  );

-- Log da operação
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deletadas % transações sale_revenue de vendas com menos de 3 dias', deleted_count;
END $$;