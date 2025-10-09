
-- Reverter as vendas que foram aprovadas incorretamente
-- Manter apenas as 88 vendas mais antigas como completed, o resto volta para pending

-- 1. Identificar as 88 vendas mais antigas e marcar o resto como pending novamente
WITH ranked_orders AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM orders
  WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
    AND status = 'completed'
)
UPDATE orders
SET status = 'pending'
FROM ranked_orders
WHERE orders.id = ranked_orders.id
  AND ranked_orders.rn > 88;

-- 2. Deletar transações de crédito das vendas que voltaram para pending
DELETE FROM balance_transactions bt
USING orders o
WHERE bt.order_id = o.order_id
  AND bt.user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  AND bt.type = 'credit'
  AND o.status = 'pending';

-- 3. Recalcular o saldo correto do Leonardo baseado apenas nas transações restantes
UPDATE customer_balances
SET balance = (
  SELECT COALESCE(SUM(amount), 0)
  FROM balance_transactions
  WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
)
WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da';
