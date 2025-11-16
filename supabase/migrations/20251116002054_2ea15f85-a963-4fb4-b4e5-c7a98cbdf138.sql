-- Deletar vendas de teste
DELETE FROM orders 
WHERE order_id LIKE 'TEST-%' 
   OR customer_email = 'teste@kambafy.com';
