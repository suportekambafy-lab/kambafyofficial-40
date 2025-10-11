-- ============================================
-- CORREÇÃO: Sistema de Saques - Evitar Duplicação
-- ============================================

-- Problema identificado:
-- 1. Trigger refund_rejected_withdrawal executa TODA VEZ que status é 'rejeitado'
-- 2. Isso causa múltiplos estornos para o mesmo saque
-- 3. Resultado: saldo fica incorreto com valores duplicados

-- ETAPA 1: Remover trigger antigo que causa duplicação
DROP TRIGGER IF EXISTS refund_rejected_withdrawal ON withdrawal_requests;

-- ETAPA 2: Criar novo trigger que só estorna UMA VEZ
CREATE OR REPLACE FUNCTION refund_rejected_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ✅ Só estornar se o status MUDOU para 'rejeitado' (não estava rejeitado antes)
  IF NEW.status = 'rejeitado' AND (OLD.status IS NULL OR OLD.status != 'rejeitado') THEN
    
    -- ✅ Verificar se JÁ existe um estorno para este saque
    IF NOT EXISTS (
      SELECT 1 FROM balance_transactions
      WHERE order_id = 'refund_withdrawal_' || NEW.id::text
        AND type = 'credit'
    ) THEN
      -- Criar transação de crédito (estorno)
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
        NEW.amount, -- Valor positivo para crédito (estorno)
        'KZ',
        'Estorno de saque rejeitado',
        'refund_withdrawal_' || NEW.id::text
      );
      
      RAISE NOTICE '✅ Estorno criado para saque rejeitado: % (valor: %)', NEW.id, NEW.amount;
    ELSE
      RAISE NOTICE '⚠️ Estorno já existe para saque: %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ETAPA 3: Recriar trigger com nova função
CREATE TRIGGER refund_rejected_withdrawal
  AFTER UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION refund_rejected_withdrawal();

-- ETAPA 4: Remover trigger antigo de débito e recriar com verificação
DROP TRIGGER IF EXISTS deduct_withdrawal_from_balance ON withdrawal_requests;

CREATE OR REPLACE FUNCTION deduct_withdrawal_from_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ✅ Só debitar na criação do saque (INSERT)
  -- ✅ Verificar se JÁ existe débito para este saque
  IF NOT EXISTS (
    SELECT 1 FROM balance_transactions
    WHERE order_id = 'withdrawal_' || NEW.id::text
      AND type = 'debit'
  ) THEN
    -- Criar transação de débito
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
      -NEW.amount, -- Valor negativo para débito
      'KZ',
      'Saque solicitado',
      'withdrawal_' || NEW.id::text
    );
    
    RAISE NOTICE '✅ Débito criado para saque: % (valor: -%)', NEW.id, NEW.amount;
  ELSE
    RAISE NOTICE '⚠️ Débito já existe para saque: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ETAPA 5: Recriar trigger de débito
CREATE TRIGGER deduct_withdrawal_from_balance
  AFTER INSERT ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION deduct_withdrawal_from_balance();

-- ETAPA 6: Limpar transações duplicadas existentes (manter apenas a mais recente de cada tipo)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, order_id, type
      ORDER BY created_at DESC
    ) as rn
  FROM balance_transactions
  WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
    AND (
      order_id LIKE 'withdrawal_%' 
      OR order_id LIKE 'refund_withdrawal_%'
    )
)
DELETE FROM balance_transactions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- ETAPA 7: Recalcular saldo final
SELECT recalculate_user_balance('a349acdf-584c-441e-adf8-d4bbfe217254');

-- ETAPA 8: Verificar resultado
SELECT 
  'Saldo corrigido:' as info,
  balance as saldo_disponivel,
  currency,
  updated_at
FROM customer_balances
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';