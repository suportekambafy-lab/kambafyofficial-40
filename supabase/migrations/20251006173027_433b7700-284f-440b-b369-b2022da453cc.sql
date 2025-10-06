
-- Remover o último saque pendente de victormuabi (1,812,109.96 KZ)
DELETE FROM withdrawal_requests
WHERE id = 'c07bbba8-b511-474f-8fb1-6e0b4987d847'
  AND user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND status = 'pendente';

-- Remover a transação de débito correspondente ao saque
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND type = 'debit'
  AND order_id = 'withdrawal_c07bbba8-b511-474f-8fb1-6e0b4987d847';

-- Recalcular o saldo correto baseado em todas as transações válidas
UPDATE customer_balances
SET balance = (
  SELECT COALESCE(SUM(amount), 0)
  FROM balance_transactions
  WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
),
updated_at = NOW()
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';
