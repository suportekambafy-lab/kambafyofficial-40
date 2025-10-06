-- Remover transações duplicadas de saques antigos (sem order_id)
-- Estas foram criadas por código antigo antes dos triggers serem implementados
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND type = 'debit'
  AND order_id IS NULL
  AND description LIKE 'Saque solicitado%'
  AND created_at >= '2025-10-06T16:00:00'
  AND created_at < '2025-10-06T17:26:00';

-- Recalcular o saldo correto baseado apenas nas transações válidas
UPDATE customer_balances
SET balance = (
  SELECT COALESCE(SUM(amount), 0)
  FROM balance_transactions
  WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
),
updated_at = NOW()
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';