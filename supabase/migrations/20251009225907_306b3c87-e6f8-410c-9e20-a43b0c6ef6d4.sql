
-- Corrigir saldo do Leonardo Vilas Boas
-- Problema: Há 86 créditos para 85 vendas (1 crédito a mais)
-- Solução: Recalcular o saldo baseado nas vendas reais

-- 1️⃣ Deletar TODAS as transações de crédito existentes do Leonardo
DELETE FROM public.balance_transactions
WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  AND type = 'credit';

-- 2️⃣ Recriar transações de crédito corretas para CADA venda completada
INSERT INTO public.balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  order_id,
  created_at
)
SELECT 
  o.user_id,
  'credit'::text,
  COALESCE(o.seller_commission, o.amount::numeric),
  'KZ'::text,
  'Venda - ' || p.name,
  o.order_id,
  o.created_at + INTERVAL '3 days' -- Simular liberação após 3 dias
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE o.user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  AND o.status = 'completed'
ORDER BY o.created_at;

-- 3️⃣ Recalcular e atualizar o saldo do Leonardo
UPDATE public.customer_balances
SET 
  balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM balance_transactions
    WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  ),
  updated_at = NOW()
WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da';