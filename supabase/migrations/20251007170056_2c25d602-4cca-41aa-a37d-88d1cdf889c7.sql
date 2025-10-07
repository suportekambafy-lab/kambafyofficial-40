-- ============================================
-- CORREÇÃO GLOBAL: Recalcular saldos de TODOS os usuários
-- ============================================

-- 1. Remover TODAS as transações de crédito de vendas que ainda não completaram 3 dias
DELETE FROM balance_transactions
WHERE type = 'credit'
  AND order_id IN (
    SELECT order_id 
    FROM orders 
    WHERE status = 'completed'
      AND created_at > (NOW() - INTERVAL '3 days')
      AND NOT EXISTS (
        SELECT 1 FROM payment_releases pr 
        WHERE pr.order_id = orders.order_id
      )
  );

-- 2. Para cada usuário, recalcular o saldo correto
DO $$
DECLARE
  user_record RECORD;
  correct_balance NUMERIC;
BEGIN
  -- Para cada usuário que tem saldo
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM customer_balances 
    WHERE user_id IS NOT NULL
  LOOP
    -- Calcular saldo correto baseado nas transações
    SELECT COALESCE(SUM(amount), 0) INTO correct_balance
    FROM balance_transactions
    WHERE user_id = user_record.user_id;
    
    -- Atualizar para o saldo correto
    UPDATE customer_balances
    SET 
      balance = correct_balance,
      updated_at = NOW()
    WHERE user_id = user_record.user_id;
    
    RAISE NOTICE 'Usuário % - Saldo recalculado: %', user_record.user_id, correct_balance;
  END LOOP;
END $$;

-- 3. Criar índice para performance do auto-release
CREATE INDEX IF NOT EXISTS idx_orders_status_created 
ON orders(status, created_at) 
WHERE status = 'completed';

-- 4. Criar índice para payment_releases
CREATE INDEX IF NOT EXISTS idx_payment_releases_order_id 
ON payment_releases(order_id);