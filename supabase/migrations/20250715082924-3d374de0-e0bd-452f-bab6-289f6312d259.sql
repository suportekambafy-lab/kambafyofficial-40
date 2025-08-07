-- Corrigir vendas órfãs - atualizar user_id NULL para o ID correto baseado no email
UPDATE orders 
SET user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = orders.customer_email
)
WHERE user_id IS NULL 
  AND customer_email IN (
    SELECT email FROM auth.users
  );

-- Verificar quantas foram atualizadas
SELECT 
  COUNT(*) as orders_atualizadas
FROM orders 
WHERE user_id = '5ec3e917-f22b-4218-bdea-88b5f114f6c8';