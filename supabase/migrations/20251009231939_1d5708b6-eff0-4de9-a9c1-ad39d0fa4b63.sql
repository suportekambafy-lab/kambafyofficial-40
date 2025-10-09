
-- Limpar dados existentes de Leonardo
DELETE FROM balance_transactions WHERE user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd';
DELETE FROM orders WHERE product_id IN (SELECT id FROM products WHERE user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd');
DELETE FROM products WHERE user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd';
DELETE FROM customer_balances WHERE user_id = '11ccb5b4-c496-4d15-9d64-cb109c9e85bd';

-- Criar produto para Leonardo
INSERT INTO products (
  id,
  user_id,
  name,
  price,
  type,
  status,
  admin_approved,
  created_at,
  updated_at
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11ccb5b4-c496-4d15-9d64-cb109c9e85bd',
  'Produto Leonardo',
  '35000',
  'digital',
  'Ativo',
  true,
  NOW(),
  NOW()
);

-- Criar 88 vendas completadas de 35.000 KZ cada
INSERT INTO orders (
  id,
  order_id,
  product_id,
  customer_name,
  customer_email,
  amount,
  currency,
  status,
  payment_method,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'LEO_' || LPAD(generate_series::text, 5, '0'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Cliente ' || generate_series,
  'cliente' || generate_series || '@example.com',
  '35000',
  'KZ',
  'completed',
  'express',
  NOW() - (generate_series || ' days')::interval,
  NOW() - (generate_series || ' days')::interval
FROM generate_series(1, 88);

-- Criar transações de crédito (28.000 por venda = 2.464.000 total)
INSERT INTO balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  order_id,
  created_at
)
SELECT 
  '11ccb5b4-c496-4d15-9d64-cb109c9e85bd',
  'credit',
  28000,
  'KZ',
  'Receita de venda - Produto Leonardo',
  o.order_id,
  o.created_at
FROM orders o
WHERE o.product_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
AND o.status = 'completed';

-- Criar saldo de 3.080.000 KZ (saldo diferente do total das transações para teste)
INSERT INTO customer_balances (user_id, balance, currency, created_at, updated_at)
VALUES ('11ccb5b4-c496-4d15-9d64-cb109c9e85bd', 3080000, 'KZ', NOW(), NOW());
