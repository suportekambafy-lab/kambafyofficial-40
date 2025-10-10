-- Limpeza de dados de teste do usuário leonardopedro007@gmail.com
-- User ID: 11ccb5b4-c496-4d15-9d64-cb109c9e85bd
-- Este usuário contém 84 transações fictícias totalizando 2.352.000 KZ

-- 1. Deletar pedidos (orders) associados ao produto de teste
DELETE FROM orders
WHERE product_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- 2. Deletar transações fictícias de balance_transactions
DELETE FROM balance_transactions
WHERE user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd';

-- 3. Deletar saldo fictício em customer_balances
DELETE FROM customer_balances
WHERE user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd';

-- 4. Deletar produto de teste "Produto Leonardo"
DELETE FROM products
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd';

-- 5. Deletar perfil do usuário de teste
DELETE FROM profiles
WHERE user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd';

-- Resultado esperado:
-- - Todos os pedidos do produto de teste removidos
-- - 84 transações fictícias removidas (2.352.000 KZ)
-- - 1 saldo fictício removido
-- - 1 produto de teste removido
-- - 1 perfil de usuário de teste removido