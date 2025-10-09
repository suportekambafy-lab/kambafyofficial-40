
-- Limpar saldos duplicados de Leonardo
DELETE FROM customer_balances 
WHERE user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd'
AND balance != 3080000;
