
-- Fix duplicate balance for user db21f856-4f4f-4bf1-9510-a52535cb383e
-- Current balance: 86728.90, Correct balance: 43364.45

UPDATE customer_balances 
SET balance = 43364.45, updated_at = now()
WHERE user_id = 'db21f856-4f4f-4bf1-9510-a52535cb383e';

-- Delete duplicate 'credit' transactions (keeping only sale_revenue)
DELETE FROM balance_transactions 
WHERE user_id = 'db21f856-4f4f-4bf1-9510-a52535cb383e' 
AND type = 'credit';
