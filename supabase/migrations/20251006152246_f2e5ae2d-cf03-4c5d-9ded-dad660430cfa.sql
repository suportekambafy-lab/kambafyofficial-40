-- Passo 1: Criar tabela temporária com apenas uma transação por order_id
CREATE TEMP TABLE temp_unique_transactions AS
SELECT DISTINCT ON (user_id, order_id, type, amount)
  id, user_id, type, amount, currency, description, order_id, email, created_at
FROM balance_transactions
WHERE order_id IS NOT NULL
ORDER BY user_id, order_id, type, amount, created_at ASC;

-- Passo 2: Deletar transações duplicadas (mantendo apenas a primeira)
DELETE FROM balance_transactions
WHERE order_id IS NOT NULL
  AND id NOT IN (SELECT id FROM temp_unique_transactions);

-- Passo 3: Recalcular o saldo correto para todos os usuários
UPDATE customer_balances cb
SET 
  balance = (
    SELECT COALESCE(SUM(bt.amount), 0)
    FROM balance_transactions bt
    WHERE bt.user_id = cb.user_id
  ),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 
  FROM balance_transactions bt 
  WHERE bt.user_id = cb.user_id
);

-- Passo 4: Adicionar constraint para evitar duplicações futuras
-- (Permitir múltiplas transações sem order_id, mas não duplicatas com order_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_balance_transactions_unique_order 
ON balance_transactions (user_id, order_id, type, amount)
WHERE order_id IS NOT NULL;