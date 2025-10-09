
-- Liberar pagamentos pendentes do Leonardo e Victor - Versão Simplificada

-- 1️⃣ Criar transações de crédito para vendas pendentes do Leonardo
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
  o.amount::numeric,
  'KZ'::text,
  'Liberação manual - ' || p.name,
  o.order_id,
  NOW()
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE o.user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  AND o.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM balance_transactions bt 
    WHERE bt.order_id = o.order_id AND bt.type = 'credit'
  );

-- 2️⃣ Atualizar saldo do Leonardo
UPDATE public.customer_balances
SET 
  balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM balance_transactions
    WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  ),
  updated_at = NOW()
WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da';

-- 3️⃣ Criar transações de crédito para Victor (se houver vendas)
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
  o.amount::numeric,
  'KZ'::text,
  'Liberação manual - ' || p.name,
  o.order_id,
  NOW()
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE o.user_id IN ('f0d4e4e4-b975-467b-9eba-f373bc813f2d', 'fcd3886e-a3b2-45a3-b39d-c84c89debb45')
  AND o.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM balance_transactions bt 
    WHERE bt.order_id = o.order_id AND bt.type = 'credit'
  );

-- 4️⃣ Atualizar saldo do Victor (se existir)
UPDATE public.customer_balances
SET 
  balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM balance_transactions
    WHERE user_id = customer_balances.user_id
  ),
  updated_at = NOW()
WHERE user_id IN ('f0d4e4e4-b975-467b-9eba-f373bc813f2d', 'fcd3886e-a3b2-45a3-b39d-c84c89debb45');
