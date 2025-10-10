
-- REMOVER créditos duplicados criados hoje (após 23:00)
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
AND type = 'credit'
AND created_at >= '2025-10-09 23:00:00';

-- Recalcular saldo correto baseado nas transações restantes
UPDATE customer_balances
SET 
  balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM balance_transactions
    WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  ),
  updated_at = NOW()
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';
