-- =====================================================
-- CORREÇÃO DIRETA DE 7 SALDOS - Confirmado pelo Admin
-- =====================================================

-- Victor Muabi: 430.000 Kz
UPDATE customer_balances SET balance = 430000.00, updated_at = now() 
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';

-- Dário Gourgel: 0 Kz
UPDATE customer_balances SET balance = 0, updated_at = now() 
WHERE user_id = 'a906647b-3e73-4ddc-a8ed-c00cdd7b8c31';

-- Kelson Dias: 0 Kz
UPDATE customer_balances SET balance = 0, updated_at = now() 
WHERE user_id = 'c9c025be-0609-49fe-9b5e-e19201c37ea7';

-- Bruno Morais: 1.348,50 Kz
UPDATE customer_balances SET balance = 1348.50, updated_at = now() 
WHERE user_id = '2fd7e1c6-7f49-4084-a772-99b30b6e74c3';

-- Amado Ruben: 0 Kz
UPDATE customer_balances SET balance = 0, updated_at = now() 
WHERE user_id = 'fa452bdf-7c43-4846-8355-e5cc47ea00f3';

-- Negocios Online: 0 Kz
UPDATE customer_balances SET balance = 0, updated_at = now() 
WHERE user_id = 'cd58e794-0864-48e5-b638-faaa317e7432';

-- Emanuel Lopes: 0 Kz
UPDATE customer_balances SET balance = 0, updated_at = now() 
WHERE user_id = '094047d0-8120-484b-8966-cd80c9e09ee7';