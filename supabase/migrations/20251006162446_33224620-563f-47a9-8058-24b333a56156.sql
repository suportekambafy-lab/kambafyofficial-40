-- ============================================
-- CORREÇÃO: Reconstruir transações e saldos
-- Problema: migração anterior usou o.user_id (não existe)
-- Solução: usar p.user_id corretamente
-- ============================================

-- 1. Remover índice único temporariamente
DROP INDEX IF EXISTS public.idx_balance_transactions_unique_order;

-- 2. Backup de saques e taxas Kambafy
CREATE TEMP TABLE temp_withdrawals AS
SELECT * FROM public.balance_transactions
WHERE type IN ('debit', 'kambafy_fee', 'sale_revenue');

-- 3. Limpar balance_transactions completamente
TRUNCATE public.balance_transactions;

-- 4. Restaurar saques e taxas
INSERT INTO public.balance_transactions 
SELECT * FROM temp_withdrawals;

-- 5. Recriar TODAS as transações de vendas (corrigido)
INSERT INTO public.balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  order_id,
  created_at
)
SELECT DISTINCT ON (p.user_id, o.order_id)
  p.user_id,
  'credit' as type,
  CASE 
    WHEN o.currency = 'EUR' THEN o.amount::numeric * 1000
    ELSE o.amount::numeric
  END as amount,
  'KZ' as currency,
  'Venda de ' || p.name as description,
  o.order_id,
  o.created_at
FROM public.orders o
INNER JOIN public.products p ON o.product_id = p.id
WHERE o.status = 'completed'
  AND p.user_id IS NOT NULL  -- ✅ CORRIGIDO: usar p.user_id
ORDER BY p.user_id, o.order_id, o.created_at DESC;

-- 6. Recalcular customer_balances
TRUNCATE public.customer_balances;

INSERT INTO public.customer_balances (user_id, balance, currency, created_at, updated_at)
SELECT 
  user_id,
  SUM(amount) as balance,
  'KZ' as currency,
  NOW() as created_at,
  NOW() as updated_at
FROM public.balance_transactions
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- 7. Recriar índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_balance_transactions_unique_order 
ON public.balance_transactions(user_id, order_id, type) 
WHERE order_id IS NOT NULL AND type = 'credit';

-- 8. Validação
DO $$
DECLARE
  total_credits NUMERIC;
  total_orders BIGINT;
  total_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0), COUNT(*) 
  INTO total_credits, total_orders
  FROM public.balance_transactions 
  WHERE type = 'credit';
  
  SELECT COALESCE(SUM(balance), 0) 
  INTO total_balance
  FROM public.customer_balances;
  
  RAISE NOTICE '✅ CORREÇÃO CONCLUÍDA:';
  RAISE NOTICE '  - Transações credit: % (% KZ)', total_orders, total_credits;
  RAISE NOTICE '  - Saldo total customer_balances: % KZ', total_balance;
  RAISE NOTICE '  - Esperado: 200 transações = 5.983.020 KZ';
END $$;