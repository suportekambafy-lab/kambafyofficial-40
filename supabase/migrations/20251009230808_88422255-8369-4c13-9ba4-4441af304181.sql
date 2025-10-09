-- Corrigir para manter apenas as 88 vendas mais antigas como completed
-- Identificar as vendas completed dos produtos do Leonardo e reverter as 3 mais recentes

WITH leonardo_orders AS (
  SELECT o.id, o.created_at, o.order_id
  FROM orders o
  INNER JOIN products p ON o.product_id = p.id
  WHERE p.user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
    AND o.status = 'completed'
  ORDER BY o.created_at ASC
),
ranked_orders AS (
  SELECT 
    id,
    order_id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM leonardo_orders
)
UPDATE orders
SET status = 'pending'
FROM ranked_orders
WHERE orders.id = ranked_orders.id
  AND ranked_orders.rn > 88;

-- Deletar transações de crédito das vendas que voltaram para pending
DELETE FROM balance_transactions bt
USING orders o
INNER JOIN products p ON o.product_id = p.id
WHERE bt.order_id = o.order_id
  AND p.user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  AND bt.type = 'credit'
  AND o.status = 'pending';

-- Recalcular o saldo do Leonardo
UPDATE customer_balances
SET balance = (
  SELECT COALESCE(SUM(amount), 0)
  FROM balance_transactions
  WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
)
WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da';