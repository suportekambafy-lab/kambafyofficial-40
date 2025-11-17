
-- Solução final: Simplesmente deletar transações duplicadas com user_id NULL
-- As transações corretas já existem no sistema

DELETE FROM balance_transactions
WHERE order_id IN ('6HOYCTLOE', 'QSASCA6NJ', 'S756E1H9G')
  AND user_id IS NULL;

-- Recalcular o saldo do vendedor
UPDATE customer_balances
SET balance = (
  SELECT COALESCE(SUM(amount), 0)
  FROM balance_transactions
  WHERE user_id = '2fd7e1c6-7f49-4084-a772-99b30b6e74c3'
),
updated_at = NOW()
WHERE user_id = '2fd7e1c6-7f49-4084-a772-99b30b6e74c3';

-- Verificar resultado final
SELECT 
  user_id,
  balance,
  currency,
  updated_at
FROM customer_balances
WHERE user_id = '2fd7e1c6-7f49-4084-a772-99b30b6e74c3';
