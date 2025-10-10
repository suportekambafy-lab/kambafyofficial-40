
-- Ajuste final para Victor Muabi atingir 8.600.000 KZ

-- Remover o ajuste anterior se existir
DELETE FROM balance_transactions 
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND description = 'Ajuste de vendas para correção de saldo';

-- Calcular quanto falta para chegar a 8.600.000 KZ
-- Atualmente: 7.847.381 KZ em seller_commission
-- Meta: 8.600.000 KZ
-- Diferença: 752.619 KZ

INSERT INTO balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  order_id,
  created_at
)
VALUES (
  'a349acdf-584c-441e-adf8-d4bbfe217254'::uuid,
  'credit',
  752619,
  'KZ',
  'Ajuste de receita para correção de saldo total',
  'adjustment_revenue_' || gen_random_uuid()::text,
  NOW()
);

-- Recalcular saldo baseado em todas as transações
UPDATE customer_balances
SET 
  balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM balance_transactions
    WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  ),
  updated_at = NOW()
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';
