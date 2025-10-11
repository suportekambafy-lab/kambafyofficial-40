
-- ============================================
-- CORREÇÃO DEFINITIVA: Sistema de Saques
-- ============================================

-- PROBLEMA: Mesmo com as correções anteriores, ainda podem acontecer duplicações
-- SOLUÇÃO: Adicionar constraints e melhorar validações

-- ETAPA 1: Adicionar constraint UNIQUE para evitar transações duplicadas
-- Isso garante que NUNCA haverá duas transações com mesmo order_id e tipo
ALTER TABLE balance_transactions 
DROP CONSTRAINT IF EXISTS unique_transaction_per_order;

ALTER TABLE balance_transactions 
ADD CONSTRAINT unique_transaction_per_order 
UNIQUE (user_id, order_id, type);

-- ETAPA 2: Melhorar função de débito de saque
CREATE OR REPLACE FUNCTION deduct_withdrawal_from_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_debit BOOLEAN;
BEGIN
  -- Verificar se JÁ existe um débito para este saque
  SELECT EXISTS (
    SELECT 1 FROM balance_transactions
    WHERE order_id = 'withdrawal_' || NEW.id::text
      AND type = 'debit'
      AND user_id = NEW.user_id
  ) INTO existing_debit;
  
  -- Se não existe, criar
  IF NOT existing_debit THEN
    BEGIN
      INSERT INTO public.balance_transactions (
        user_id,
        type,
        amount,
        currency,
        description,
        order_id
      )
      VALUES (
        NEW.user_id,
        'debit',
        -ABS(NEW.amount), -- Garantir que seja negativo
        'KZ',
        'Saque solicitado',
        'withdrawal_' || NEW.id::text
      );
      
      RAISE NOTICE '✅ Débito criado: saque % (-%)', NEW.id, NEW.amount;
    EXCEPTION 
      WHEN unique_violation THEN
        RAISE NOTICE '⚠️ Débito já existe (constraint): saque %', NEW.id;
    END;
  ELSE
    RAISE NOTICE '⚠️ Débito já existe: saque %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ETAPA 3: Melhorar função de estorno de saque rejeitado
CREATE OR REPLACE FUNCTION refund_rejected_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_refund BOOLEAN;
BEGIN
  -- Só processar se o status MUDOU PARA 'rejeitado'
  IF NEW.status = 'rejeitado' AND (OLD.status IS NULL OR OLD.status != 'rejeitado') THEN
    
    -- Verificar se JÁ existe estorno
    SELECT EXISTS (
      SELECT 1 FROM balance_transactions
      WHERE order_id = 'refund_withdrawal_' || NEW.id::text
        AND type = 'credit'
        AND user_id = NEW.user_id
    ) INTO existing_refund;
    
    -- Se não existe, criar
    IF NOT existing_refund THEN
      BEGIN
        INSERT INTO public.balance_transactions (
          user_id,
          type,
          amount,
          currency,
          description,
          order_id
        )
        VALUES (
          NEW.user_id,
          'credit',
          ABS(NEW.amount), -- Garantir que seja positivo
          'KZ',
          'Estorno de saque rejeitado',
          'refund_withdrawal_' || NEW.id::text
        );
        
        RAISE NOTICE '✅ Estorno criado: saque % (+%)', NEW.id, NEW.amount;
      EXCEPTION 
        WHEN unique_violation THEN
          RAISE NOTICE '⚠️ Estorno já existe (constraint): saque %', NEW.id;
      END;
    ELSE
      RAISE NOTICE '⚠️ Estorno já existe: saque %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ETAPA 4: Recalcular TODOS os saldos do sistema
DO $$
DECLARE
  user_record RECORD;
  correct_balance NUMERIC;
BEGIN
  -- Para cada usuário que tem transações
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM balance_transactions 
    WHERE user_id IS NOT NULL
  LOOP
    -- Calcular saldo correto
    SELECT COALESCE(SUM(amount), 0) INTO correct_balance
    FROM balance_transactions
    WHERE user_id = user_record.user_id;
    
    -- Atualizar ou criar registro de saldo
    INSERT INTO customer_balances (user_id, balance, currency)
    VALUES (user_record.user_id, correct_balance, 'KZ')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = correct_balance,
      updated_at = NOW();
    
    RAISE NOTICE 'Saldo recalculado para user %: %', user_record.user_id, correct_balance;
  END LOOP;
END $$;

-- ETAPA 5: Verificar se há algum saldo negativo após recálculo
SELECT 
  p.full_name,
  p.email,
  cb.balance as saldo_atual,
  (
    SELECT COUNT(*) FROM balance_transactions bt
    WHERE bt.user_id = cb.user_id
  ) as total_transacoes
FROM customer_balances cb
JOIN profiles p ON p.id = cb.user_id
WHERE cb.balance < 0
ORDER BY cb.balance ASC
LIMIT 10;
