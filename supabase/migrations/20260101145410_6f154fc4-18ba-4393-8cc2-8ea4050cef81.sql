-- Zerar saldo de Carlos Silva (fd1b3c4d-a38c-4783-9d93-5803ecdc85be)
UPDATE currency_balances 
SET balance = 0, updated_at = now()
WHERE user_id = 'fd1b3c4d-a38c-4783-9d93-5803ecdc85be' AND currency = 'KZ';

UPDATE customer_balances 
SET balance = 0, updated_at = now()
WHERE user_id = 'fd1b3c4d-a38c-4783-9d93-5803ecdc85be';