
-- Deletar vendas duplicadas, mantendo apenas a mais recente
DELETE FROM orders
WHERE id IN (
  SELECT o.id
  FROM orders o
  JOIN products p ON p.id = o.product_id
  WHERE p.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND o.status = 'completed'
  AND o.id NOT IN (
    SELECT DISTINCT ON (order_id) id
    FROM orders
    WHERE product_id IN (SELECT id FROM products WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254')
    AND status = 'completed'
    ORDER BY order_id, created_at DESC
  )
);

-- Limpar créditos antigos
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
AND type = 'credit';

-- Criar créditos corretos (uma vez por venda)
INSERT INTO balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  order_id,
  created_at
)
SELECT 
  'a349acdf-584c-441e-adf8-d4bbfe217254'::uuid,
  'credit',
  o.amount::numeric,
  o.currency,
  'Liberação de saldo - ' || prod.name,
  o.order_id,
  o.created_at
FROM orders o
JOIN products prod ON prod.id = o.product_id
WHERE prod.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
AND o.status = 'completed';

-- Estornar saques rejeitados
INSERT INTO balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  order_id
)
SELECT 
  'a349acdf-584c-441e-adf8-d4bbfe217254'::uuid,
  'credit',
  wr.amount,
  'KZ',
  'Estorno de saque rejeitado',
  'refund_withdrawal_' || wr.id::text
FROM withdrawal_requests wr
WHERE wr.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
AND wr.status = 'rejeitado';

-- Recalcular saldo final
UPDATE customer_balances
SET 
  balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM balance_transactions
    WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  ),
  updated_at = NOW()
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';
