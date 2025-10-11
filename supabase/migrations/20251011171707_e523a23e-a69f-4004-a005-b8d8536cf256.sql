-- ✅ CORREÇÃO DEFINITIVA: Remover TODAS as transações "credit" duplicadas

-- ETAPA 1: Remover "Liberação de saldo" (sistema antigo duplicado)
-- Essas vendas já estão registradas como sale_revenue no sistema novo
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND type = 'credit'
  AND description LIKE 'Liberação de saldo%';

-- ETAPA 2: Remover "Ajuste de receita" (correção manual duplicada)
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND type = 'credit'
  AND description LIKE 'Ajuste de receita%';

-- ETAPA 3: Remover estornos de saques rejeitados (já estão balanceados com os débitos)
-- IMPORTANTE: Os estornos são corretos, mas vou remover porque removemos os débitos órfãos
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND type = 'credit'
  AND description = 'Estorno de saque rejeitado';

-- ETAPA 4: Recriar débitos dos saques rejeitados (para balancear)
INSERT INTO balance_transactions (user_id, type, amount, currency, description, order_id)
SELECT 
  'a349acdf-584c-441e-adf8-d4bbfe217254'::uuid,
  'debit',
  -wr.amount,
  'KZ',
  'Saque solicitado',
  'withdrawal_' || wr.id::text
FROM withdrawal_requests wr
WHERE wr.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND wr.status = 'rejeitado'
  AND NOT EXISTS (
    SELECT 1 FROM balance_transactions bt
    WHERE bt.order_id = 'withdrawal_' || wr.id::text
    AND bt.type = 'debit'
    AND bt.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  );

-- ETAPA 5: Recriar estornos dos saques rejeitados
INSERT INTO balance_transactions (user_id, type, amount, currency, description, order_id)
SELECT 
  'a349acdf-584c-441e-adf8-d4bbfe217254'::uuid,
  'credit',
  wr.amount,
  'KZ',
  'Estorno de saque rejeitado',
  'refund_withdrawal_' || wr.id::text
FROM withdrawal_requests wr
WHERE wr.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND wr.status = 'rejeitado'
  AND NOT EXISTS (
    SELECT 1 FROM balance_transactions bt
    WHERE bt.order_id = 'refund_withdrawal_' || wr.id::text
    AND bt.type = 'credit'
    AND bt.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  );

-- ETAPA 6: Recalcular saldo final
SELECT recalculate_user_balance('a349acdf-584c-441e-adf8-d4bbfe217254');

-- ETAPA 7: Verificar resultado
SELECT 
  balance as saldo_final,
  currency
FROM customer_balances
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';