-- ✅ CORREÇÃO FINAL: Remover transações sale_revenue órfãs (sem venda correspondente)

-- ETAPA 1: Contar transações órfãs
WITH orphan_revenues AS (
  SELECT bt.id, bt.order_id, bt.amount
  FROM balance_transactions bt
  WHERE bt.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
    AND bt.type IN ('sale_revenue', 'platform_fee')
    AND NOT EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.order_id = bt.order_id 
        AND o.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
        AND o.status = 'completed'
    )
    AND NOT EXISTS (
      SELECT 1 FROM module_payments mp
      JOIN member_areas ma ON mp.member_area_id = ma.id
      WHERE mp.order_id = bt.order_id
        AND ma.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
        AND mp.status = 'completed'
    )
)
SELECT 
  'Transações órfãs encontradas:' as info,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM orphan_revenues;

-- ETAPA 2: Remover sale_revenue e platform_fee órfãs
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND type IN ('sale_revenue', 'platform_fee')
  AND NOT EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.order_id = balance_transactions.order_id 
      AND o.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
      AND o.status = 'completed'
  )
  AND NOT EXISTS (
    SELECT 1 FROM module_payments mp
    JOIN member_areas ma ON mp.member_area_id = ma.id
    WHERE mp.order_id = balance_transactions.order_id
      AND ma.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
      AND mp.status = 'completed'
  );

-- ETAPA 3: Recalcular saldo final
SELECT recalculate_user_balance('a349acdf-584c-441e-adf8-d4bbfe217254');

-- ETAPA 4: Verificar resultado final
SELECT 
  balance as saldo_final_correto,
  currency,
  updated_at
FROM customer_balances
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';