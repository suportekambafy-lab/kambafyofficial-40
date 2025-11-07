
-- ============================================
-- LIMPAR DUPLICATAS E APLICAR CONSTRAINT
-- ============================================

-- Passo 1: Limpar duplicatas mantendo a mais recente
DO $$
DECLARE
  duplicate_record RECORD;
  kept_id UUID;
BEGIN
  FOR duplicate_record IN 
    SELECT bt.order_id as oid, bt.user_id as uid, COUNT(*) as cnt
    FROM balance_transactions bt
    WHERE bt.order_id IS NOT NULL AND bt.user_id IS NOT NULL
    GROUP BY bt.order_id, bt.user_id
    HAVING COUNT(*) > 1
  LOOP
    -- Manter transação mais recente
    SELECT bt.id INTO kept_id
    FROM balance_transactions bt
    WHERE bt.order_id = duplicate_record.oid
      AND bt.user_id = duplicate_record.uid
    ORDER BY bt.created_at DESC
    LIMIT 1;
    
    -- Deletar duplicatas
    DELETE FROM balance_transactions bt
    WHERE bt.order_id = duplicate_record.oid
      AND bt.user_id = duplicate_record.uid
      AND bt.id != kept_id;
      
    RAISE NOTICE 'Limpou % duplicatas para order_id=%, user_id=%', 
      (duplicate_record.cnt - 1), duplicate_record.oid, duplicate_record.uid;
  END LOOP;
END;
$$;

-- Passo 2: Recalcular saldos afetados
DO $$
DECLARE
  affected_user RECORD;
  correct_balance NUMERIC;
BEGIN
  FOR affected_user IN 
    SELECT DISTINCT user_id FROM balance_transactions WHERE user_id IS NOT NULL
  LOOP
    SELECT COALESCE(SUM(amount), 0) INTO correct_balance
    FROM balance_transactions WHERE user_id = affected_user.user_id;
    
    INSERT INTO customer_balances (user_id, balance, currency)
    VALUES (affected_user.user_id, correct_balance, 'KZ')
    ON CONFLICT (user_id) DO UPDATE
    SET balance = correct_balance, updated_at = NOW();
  END LOOP;
END;
$$;

-- Passo 3: Criar índice único para prevenir futuras duplicatas
DROP INDEX IF EXISTS idx_balance_transactions_unique_order;

CREATE UNIQUE INDEX idx_balance_transactions_order_user_unique
ON balance_transactions (order_id, user_id)
WHERE order_id IS NOT NULL AND user_id IS NOT NULL;
