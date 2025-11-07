
-- ============================================
-- APENAS LIMPAR DUPLICATAS E MELHORAR TRIGGERS
-- (O índice único já existe)
-- ============================================

-- Passo 1: Limpar duplicatas
DO $$
DECLARE
  duplicate_record RECORD;
  kept_id UUID;
  total_cleaned INTEGER := 0;
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
      
    total_cleaned := total_cleaned + (duplicate_record.cnt - 1);
    RAISE NOTICE 'Limpou % duplicatas para order_id=%, user_id=%', 
      (duplicate_record.cnt - 1), duplicate_record.oid, duplicate_record.uid;
  END LOOP;
  
  RAISE NOTICE 'Total de transações duplicadas removidas: %', total_cleaned;
END;
$$;

-- Passo 2: Recalcular todos os saldos
DO $$
DECLARE
  affected_user RECORD;
  correct_balance NUMERIC;
  total_recalculated INTEGER := 0;
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
    
    total_recalculated := total_recalculated + 1;
  END LOOP;
  
  RAISE NOTICE 'Total de saldos recalculados: %', total_recalculated;
END;
$$;

-- Passo 3: Triggers melhorados com verificação robusta
CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  product_record RECORD;
  net_amount NUMERIC;
  existing_count INTEGER;
BEGIN
  IF (NEW.status = 'completed') 
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status)) THEN
    
    SELECT user_id, name INTO product_record
    FROM public.products WHERE id = NEW.product_id;
    
    IF product_record IS NULL THEN
      RAISE WARNING 'Produto não encontrado para order_id: %', NEW.order_id;
      RETURN NEW;
    END IF;
    
    -- Verificação robusta de duplicatas
    SELECT COUNT(*) INTO existing_count
    FROM public.balance_transactions 
    WHERE order_id = NEW.order_id AND user_id = product_record.user_id;
    
    IF existing_count > 0 THEN
      RAISE NOTICE 'Transação duplicada bloqueada: order_id=%, user_id=%', 
        NEW.order_id, product_record.user_id;
      RETURN NEW;
    END IF;
    
    net_amount := COALESCE(
      NULLIF(NEW.seller_commission::numeric, 0),
      (NEW.amount::numeric * 0.9101)
    );
    
    IF net_amount <= 0 OR net_amount > 100000000 THEN
      RAISE WARNING 'Valor inválido para order_id %: %', NEW.order_id, net_amount;
      RETURN NEW;
    END IF;
    
    BEGIN
      INSERT INTO public.balance_transactions (
        user_id, type, amount, currency, description, order_id
      ) VALUES (
        product_record.user_id,
        'sale_revenue',
        net_amount,
        NEW.currency,
        'Receita de venda (valor líquido após taxa de 8.99%)',
        NEW.order_id
      );
    EXCEPTION 
      WHEN unique_violation THEN
        RAISE NOTICE 'Duplicata detectada por constraint: order_id=%', NEW.order_id;
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao criar transação: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_module_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  seller_id UUID;
  net_amount NUMERIC;
  existing_count INTEGER;
BEGIN
  IF (NEW.status = 'completed') 
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status)) THEN
    
    SELECT ma.user_id INTO seller_id
    FROM public.member_areas ma WHERE ma.id = NEW.member_area_id;
    
    IF seller_id IS NULL THEN
      RAISE WARNING 'Seller não encontrado para member_area_id: %', NEW.member_area_id;
      RETURN NEW;
    END IF;
    
    SELECT COUNT(*) INTO existing_count
    FROM public.balance_transactions 
    WHERE order_id = NEW.order_id AND user_id = seller_id;
    
    IF existing_count > 0 THEN
      RAISE NOTICE 'Transação de módulo duplicada bloqueada: order_id=%', NEW.order_id;
      RETURN NEW;
    END IF;
    
    net_amount := NEW.amount::numeric * 0.9101;
    
    IF net_amount <= 0 OR net_amount > 100000000 THEN
      RAISE WARNING 'Valor inválido para order_id %: %', NEW.order_id, net_amount;
      RETURN NEW;
    END IF;
    
    BEGIN
      INSERT INTO public.balance_transactions (
        user_id, type, amount, currency, description, order_id
      ) VALUES (
        seller_id,
        'sale_revenue',
        net_amount,
        NEW.currency,
        'Receita de venda de módulo (valor líquido após taxa de 8.99%)',
        NEW.order_id
      );
    EXCEPTION 
      WHEN unique_violation THEN
        RAISE NOTICE 'Duplicata de módulo detectada: order_id=%', NEW.order_id;
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao criar transação de módulo: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Função de auditoria para detectar problemas
CREATE OR REPLACE FUNCTION public.audit_balance_transactions()
RETURNS TABLE(
  order_id TEXT,
  user_id UUID,
  transaction_count BIGINT,
  total_amount NUMERIC,
  types TEXT[]
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    bt.order_id,
    bt.user_id,
    COUNT(*) as transaction_count,
    SUM(bt.amount) as total_amount,
    ARRAY_AGG(DISTINCT bt.type) as types
  FROM balance_transactions bt
  WHERE bt.order_id IS NOT NULL AND bt.user_id IS NOT NULL
  GROUP BY bt.order_id, bt.user_id
  HAVING COUNT(*) > 1
  ORDER BY transaction_count DESC;
$$;
