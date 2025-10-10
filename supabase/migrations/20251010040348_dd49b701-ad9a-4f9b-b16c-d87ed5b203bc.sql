
-- LIMPAR TODOS os créditos de vendas de Victor
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
AND type = 'credit';

-- Criar um único crédito por venda usando o valor correto do campo amount
INSERT INTO balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  order_id,
  created_at
)
SELECT DISTINCT ON (o.order_id)
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
AND o.status = 'completed'
ORDER BY o.order_id, o.created_at;

-- Recalcular saldo
UPDATE customer_balances
SET 
  balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM balance_transactions
    WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  ),
  updated_at = NOW()
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';
