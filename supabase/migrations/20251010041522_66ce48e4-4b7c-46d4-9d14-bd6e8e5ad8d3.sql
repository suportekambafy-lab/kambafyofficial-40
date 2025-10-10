
-- Ajustar vendas do Victor Muabi para 8.600.000 KZ

-- 1. Adicionar crédito de ajuste para completar os 8.600.000 KZ
-- Atualmente tem 7.937.381 KZ, falta 662.619 KZ
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
  662619,
  'KZ',
  'Ajuste de vendas para correção de saldo',
  'adjustment_' || gen_random_uuid()::text,
  NOW()
);

-- 2. Recalcular saldo final
UPDATE customer_balances
SET 
  balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM balance_transactions
    WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  ),
  updated_at = NOW()
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';
