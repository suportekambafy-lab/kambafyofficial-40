-- Restaurar valores retidos corrigindo o saldo total
-- Para Vendedor bonito
UPDATE customer_balances 
SET balance = 157190.51
WHERE user_id = 'c9c025be-0609-49fe-9b5e-e19201c37ea7';

UPDATE profiles 
SET retained_fixed_amount = 157190.51
WHERE user_id = 'c9c025be-0609-49fe-9b5e-e19201c37ea7';

-- Para Dario Gourgel  
UPDATE customer_balances 
SET balance = 452500
WHERE user_id = 'a906647b-3e73-4ddc-a8ed-c00cdd7b8c31';

UPDATE profiles 
SET retained_fixed_amount = 452500
WHERE user_id = 'a906647b-3e73-4ddc-a8ed-c00cdd7b8c31';