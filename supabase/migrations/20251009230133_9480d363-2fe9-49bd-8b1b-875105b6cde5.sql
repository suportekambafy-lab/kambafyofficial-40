
-- Mover todas as vendas do Leonardo para saldo disponível
-- Usando UPDATE FROM para evitar erro de múltiplas linhas

UPDATE public.balance_transactions bt
SET created_at = o.created_at + INTERVAL '3 days' + INTERVAL '1 hour'
FROM orders o
WHERE bt.user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  AND bt.type = 'credit'
  AND bt.order_id = o.order_id;

-- Garantir que o saldo está correto
UPDATE public.customer_balances
SET 
  balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM balance_transactions
    WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  ),
  updated_at = NOW()
WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da';