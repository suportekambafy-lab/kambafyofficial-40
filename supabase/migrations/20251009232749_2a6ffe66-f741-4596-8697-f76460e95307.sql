
-- Cancelar as 2 vendas mais recentes de Leonardo e remover transações
UPDATE orders 
SET status = 'cancelled', updated_at = NOW()
WHERE id IN (
  SELECT o.id FROM orders o
  JOIN products p ON o.product_id = p.id
  WHERE p.user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd'
  AND o.status = 'completed'
  ORDER BY o.created_at DESC
  LIMIT 2
);

-- Remover transações das 2 vendas canceladas
DELETE FROM balance_transactions 
WHERE user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd'
AND order_id IN (
  SELECT o.order_id FROM orders o
  JOIN products p ON o.product_id = p.id
  WHERE p.user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd'
  AND o.status = 'cancelled'
  ORDER BY o.created_at DESC
  LIMIT 2
);

-- Manter saldo em 3.010.362 KZ (já está correto)
UPDATE customer_balances
SET balance = 3010362, updated_at = NOW()
WHERE user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd';
