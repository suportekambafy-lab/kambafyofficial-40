-- ============================================
-- IMPLEMENTAR CRÉDITO IMEDIATO DO SALDO
-- Remove período de 3 dias - saldo creditado imediatamente
-- ============================================

-- 1. Atualizar sync_customer_balance para creditar TODOS os tipos de transação
CREATE OR REPLACE FUNCTION public.sync_customer_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  -- ✅ ATUALIZAR SALDO PARA TODOS OS TIPOS DE TRANSAÇÃO
  -- Incluindo sale_revenue (crédito imediato após venda)
  
  IF NEW.user_id IS NOT NULL THEN
    -- Buscar saldo atual
    SELECT balance INTO current_balance
    FROM public.customer_balances
    WHERE user_id = NEW.user_id;
    
    -- Se não existe registro, criar um
    IF current_balance IS NULL THEN
      INSERT INTO public.customer_balances (user_id, balance, currency)
      VALUES (NEW.user_id, NEW.amount, NEW.currency);
    ELSE
      -- Atualizar saldo existente
      UPDATE public.customer_balances
      SET 
        balance = balance + NEW.amount,
        updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Garantir que o trigger está ativo
DROP TRIGGER IF EXISTS sync_balance_on_transaction ON balance_transactions;

CREATE TRIGGER sync_balance_on_transaction
  AFTER INSERT ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_customer_balance();

-- 3. Recalcular TODOS os saldos baseado nas transações existentes
DO $$
DECLARE
  user_record RECORD;
  correct_balance NUMERIC;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM balance_transactions 
    WHERE user_id IS NOT NULL
  LOOP
    -- Calcular saldo correto (soma de TODAS as transações)
    SELECT COALESCE(SUM(amount), 0) INTO correct_balance
    FROM balance_transactions
    WHERE user_id = user_record.user_id;
    
    -- Atualizar ou criar registro de saldo
    INSERT INTO customer_balances (user_id, balance, currency)
    VALUES (user_record.user_id, correct_balance, 'KZ')
    ON CONFLICT (user_id) DO UPDATE
    SET balance = correct_balance, updated_at = NOW();
  END LOOP;
  
  RAISE NOTICE 'Saldos recalculados para % usuários', (SELECT COUNT(DISTINCT user_id) FROM balance_transactions WHERE user_id IS NOT NULL);
END $$;