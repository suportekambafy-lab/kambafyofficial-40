-- ❌ PROBLEMA REAL: Débitos de saques que NÃO existem na tabela withdrawal_requests
-- Esses débitos estão reduzindo o saldo indevidamente

-- ETAPA 1: Identificar débitos de saques órfãos (sem withdrawal_request correspondente)
WITH orphan_debits AS (
  SELECT 
    bt.id,
    bt.amount,
    bt.order_id,
    bt.description,
    bt.created_at
  FROM balance_transactions bt
  WHERE bt.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
    AND bt.type = 'debit'
    AND bt.order_id LIKE 'withdrawal_%'
    AND REPLACE(bt.order_id, 'withdrawal_', '')::uuid NOT IN (
      SELECT id FROM withdrawal_requests
    )
)
SELECT 
  'Débitos órfãos encontrados:' as info,
  COUNT(*) as quantidade,
  SUM(amount) as total_negativo
FROM orphan_debits;

-- ETAPA 2: Remover débitos de saques órfãos
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND type = 'debit'
  AND order_id LIKE 'withdrawal_%'
  AND REPLACE(order_id, 'withdrawal_', '')::uuid NOT IN (
    SELECT id FROM withdrawal_requests
  );

-- ETAPA 3: Recalcular saldo após remoção
SELECT recalculate_user_balance('a349acdf-584c-441e-adf8-d4bbfe217254');

-- ETAPA 4: Verificar resultado final
SELECT 
  balance as saldo_corrigido_final,
  currency,
  updated_at
FROM customer_balances
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';