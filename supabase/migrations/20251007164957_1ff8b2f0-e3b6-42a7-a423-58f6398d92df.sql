
-- ========================================
-- FIX: Remover atualização duplicada de customer_balances
-- ========================================

-- O trigger sync_customer_balance já faz a atualização automática
-- quando há INSERT em balance_transactions, então não precisamos
-- fazer manualmente no trigger create_balance_transaction_on_sale

CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_record RECORD;
  transaction_amount NUMERIC;
  transaction_exists BOOLEAN;
BEGIN
  -- Só processar quando status mudar para completed
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'completed')) THEN
    
    -- Buscar informações do produto
    SELECT user_id, name INTO product_record
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- Se não encontrar produto ou não tiver user_id, não fazer nada
    IF product_record.user_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Verificar se já existe transação para este order_id
    SELECT EXISTS (
      SELECT 1 FROM public.balance_transactions
      WHERE order_id = NEW.order_id 
        AND type = 'credit'
        AND user_id = product_record.user_id
    ) INTO transaction_exists;
    
    -- Se já existe, não criar duplicata
    IF transaction_exists THEN
      RETURN NEW;
    END IF;
    
    -- Converter moeda se necessário (EUR -> KZ)
    IF NEW.currency = 'EUR' THEN
      transaction_amount := NEW.amount::numeric * 1000;
    ELSE
      transaction_amount := NEW.amount::numeric;
    END IF;
    
    -- ✅ APENAS criar transação de crédito
    -- O trigger sync_customer_balance vai atualizar o customer_balances automaticamente
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id,
      created_at
    )
    VALUES (
      product_record.user_id,
      'credit',
      transaction_amount,
      'KZ',
      'Venda de ' || product_record.name,
      NEW.order_id,
      NEW.created_at
    );
    
    -- ❌ REMOVIDO: Não atualizar customer_balances manualmente
    -- O trigger sync_customer_balance faz isso automaticamente
      
  END IF;
  
  RETURN NEW;
END;
$$;

-- ========================================
-- CORREÇÃO: Ajustar saldo do vendedor Dario
-- ========================================

-- Buscar user_id do Dario
DO $$
DECLARE
  dario_user_id UUID;
  correct_balance NUMERIC;
BEGIN
  -- Buscar produtos do Dario pelo email correto de perfil admin/vendedor
  SELECT user_id INTO dario_user_id
  FROM products 
  WHERE user_id IN (
    SELECT id FROM profiles WHERE email ILIKE '%dario%gourgel%'
  )
  LIMIT 1;
  
  -- Se encontrou, corrigir o saldo
  IF dario_user_id IS NOT NULL THEN
    -- Calcular saldo correto baseado nas transações
    SELECT COALESCE(SUM(amount), 0) INTO correct_balance
    FROM balance_transactions
    WHERE user_id = dario_user_id;
    
    -- Atualizar para o saldo correto
    UPDATE customer_balances
    SET 
      balance = correct_balance,
      updated_at = NOW()
    WHERE user_id = dario_user_id;
    
    RAISE NOTICE 'Saldo do vendedor Dario corrigido: % KZ', correct_balance;
  END IF;
END $$;
