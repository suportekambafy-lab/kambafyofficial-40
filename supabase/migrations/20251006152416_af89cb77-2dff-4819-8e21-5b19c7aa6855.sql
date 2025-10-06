-- Passo 1: Identificar e deletar a transação de correção duplicada
-- (manter apenas a primeira)
DELETE FROM balance_transactions
WHERE id IN (
  SELECT id 
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, amount, description, type 
        ORDER BY created_at
      ) as rn
    FROM balance_transactions
    WHERE description LIKE 'Correção:%'
      AND type = 'debit'
  ) sub
  WHERE rn > 1
);

-- Passo 2: Corrigir o sinal das transações de débito que estão positivas
UPDATE balance_transactions
SET amount = -ABS(amount)
WHERE type = 'debit'
  AND amount > 0;

-- Passo 3: Recalcular todos os saldos
UPDATE customer_balances cb
SET 
  balance = (
    SELECT COALESCE(SUM(bt.amount), 0)
    FROM balance_transactions bt
    WHERE bt.user_id = cb.user_id
  ),
  updated_at = NOW();