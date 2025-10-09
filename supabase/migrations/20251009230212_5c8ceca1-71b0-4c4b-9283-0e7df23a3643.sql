
-- Ajustar TODAS as transações do Leonardo para serem liberadas no passado
-- Colocando a data de crédito como sendo a data da venda - 1 dia (para garantir que já passou)

UPDATE public.balance_transactions bt
SET created_at = NOW() - INTERVAL '1 day'
FROM orders o
WHERE bt.user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  AND bt.type = 'credit'
  AND bt.order_id = o.order_id;