-- ✅ ETAPA 1: Recalcular saldo do Victor Muabi baseado nas transações reais
SELECT recalculate_user_balance('a349acdf-584c-441e-adf8-d4bbfe217254');

-- ✅ ETAPA 2: Identificar e remover transações duplicadas (vendas de 15.000 KZ no mesmo dia)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY order_id, type, ABS(amount)
      ORDER BY created_at
    ) as rn
  FROM public.balance_transactions
  WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
    AND order_id IS NOT NULL
)
DELETE FROM public.balance_transactions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- ✅ ETAPA 3: Recalcular novamente após remoção de duplicatas
SELECT recalculate_user_balance('a349acdf-584c-441e-adf8-d4bbfe217254');

-- ✅ ETAPA 4: Verificar resultado final
SELECT 
  user_id,
  balance as saldo_corrigido,
  currency,
  updated_at
FROM public.customer_balances
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';