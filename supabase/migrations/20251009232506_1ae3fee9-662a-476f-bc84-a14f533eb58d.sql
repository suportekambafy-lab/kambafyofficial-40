
-- Deletar 2 vendas de Leonardo para ter 86 vendas
DELETE FROM balance_transactions 
WHERE user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd'
AND order_id IN (
  SELECT order_id FROM orders o
  JOIN products p ON o.product_id = p.id
  WHERE p.user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd'
  AND o.status = 'completed'
  ORDER BY o.created_at DESC
  LIMIT 2
);

DELETE FROM orders 
WHERE id IN (
  SELECT o.id FROM orders o
  JOIN products p ON o.product_id = p.id
  WHERE p.user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd'
  AND o.status = 'completed'
  ORDER BY o.created_at DESC
  LIMIT 2
);

-- Atualizar saldo para 3.010.362 KZ
UPDATE customer_balances
SET balance = 3010362, updated_at = NOW()
WHERE user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd';
