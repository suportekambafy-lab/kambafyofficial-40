
-- Restaurar vendas de Leonardo para 'completed' (88 vendas)
UPDATE orders
SET status = 'completed', updated_at = NOW()
WHERE product_id IN (
  SELECT id FROM products WHERE user_id = '4cd5db9a-11da-4cb5-a0ac-cf87d4027bdb'
)
AND status = 'pending';

-- Criar transações de crédito para as vendas completadas
INSERT INTO balance_transactions (user_id, type, amount, currency, description, order_id, created_at)
SELECT 
  '4cd5db9a-11da-4cb5-a0ac-cf87d4027bdb',
  'credit',
  (o.amount::numeric * 0.8), -- 80% para o vendedor
  o.currency,
  'Receita de venda - ' || p.name,
  o.order_id,
  o.created_at
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE p.user_id = '4cd5db9a-11da-4cb5-a0ac-cf87d4027bdb'
AND o.status = 'completed'
AND NOT EXISTS (
  SELECT 1 FROM balance_transactions bt
  WHERE bt.order_id = o.order_id AND bt.type = 'credit'
);

-- Deletar registro existente se houver
DELETE FROM customer_balances WHERE user_id = '4cd5db9a-11da-4cb5-a0ac-cf87d4027bdb';

-- Criar registro de saldo com 3.080.000 KZ
INSERT INTO customer_balances (user_id, balance, currency, created_at, updated_at)
VALUES ('4cd5db9a-11da-4cb5-a0ac-cf87d4027bdb', 3080000, 'KZ', NOW(), NOW());
