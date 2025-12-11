-- 1. Remover a transação duplicada da Carla Morais
DELETE FROM balance_transactions 
WHERE id = 'c0a471e9-1bf6-433e-87ac-4ebabd1356af';

-- 2. Recalcular e atualizar o saldo correto (90.827,98 KZ)
UPDATE customer_balances 
SET balance = 90827.98, updated_at = now()
WHERE user_id = 'fc5f63ed-8493-4008-9602-a898b34b3c74';

-- 3. Criar índice único para prevenir duplicatas futuras
-- (order_id + type + description deve ser único para evitar transações duplicadas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_balance_transactions_unique_order 
ON balance_transactions (order_id, type, user_id) 
WHERE order_id IS NOT NULL;