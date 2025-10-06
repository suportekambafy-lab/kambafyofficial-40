
-- 1. Remover o último saque incorreto de 1.812.109,96 KZ
DELETE FROM withdrawal_requests
WHERE id = '81cdc78c-c324-4a9a-92bb-25e374e8bfe4'
  AND user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';

-- 2. Remover a transação de débito correspondente
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND order_id = 'withdrawal_81cdc78c-c324-4a9a-92bb-25e374e8bfe4';

-- 3. Remover transação de débito órfã (saque de 460K que não existe mais)
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND order_id = 'withdrawal_7eb5c797-2ba1-4fc5-babc-22f097613f90';

-- 4. Recalcular o saldo correto
UPDATE customer_balances
SET balance = (
  SELECT COALESCE(SUM(amount), 0)
  FROM balance_transactions
  WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
),
updated_at = NOW()
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';
