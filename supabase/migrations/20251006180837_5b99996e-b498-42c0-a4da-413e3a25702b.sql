-- Corrigir o saldo do Victor Muabi sincronizando com as transações reais
UPDATE customer_balances
SET 
  balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM balance_transactions
    WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  ),
  updated_at = NOW()
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';