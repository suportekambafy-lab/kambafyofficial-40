
-- ============================================
-- CORREÇÃO CRÍTICA: Remover platform_fees órfãs
-- ============================================

-- 1. Deletar platform_fees que não têm order completada correspondente
DELETE FROM public.balance_transactions bt
WHERE bt.type = 'platform_fee'
AND NOT EXISTS (
  SELECT 1 FROM public.orders o 
  WHERE o.order_id = bt.order_id 
  AND o.status = 'completed'
)
AND NOT EXISTS (
  SELECT 1 FROM public.module_payments mp
  WHERE mp.order_id = bt.order_id
  AND mp.status = 'completed'
);

-- 2. Garantir que customer_balances tenha constraint unique em user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customer_balances_user_id_key'
  ) THEN
    ALTER TABLE public.customer_balances 
    ADD CONSTRAINT customer_balances_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 3. Atualizar o trigger para APENAS criar transações quando status = 'completed'
CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  product_record RECORD;
  gross_amount NUMERIC;
  platform_fee NUMERIC;
  net_amount NUMERIC;
BEGIN
  -- ✅ Processar APENAS quando status é 'completed'
  IF (NEW.status = 'completed') 
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status)) THEN
    
    SELECT user_id, name INTO product_record
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- ✅ Verificar se já existem transações para este pedido
    IF EXISTS (
      SELECT 1 FROM public.balance_transactions 
      WHERE order_id = NEW.order_id AND (type = 'platform_fee' OR type = 'sale_revenue')
    ) THEN
      RETURN NEW;
    END IF;
    
    gross_amount := COALESCE(
      NULLIF(NEW.seller_commission::numeric, 0),
      NEW.amount::numeric
    );
    
    platform_fee := gross_amount * 0.08;
    net_amount := gross_amount - platform_fee;
    
    -- Registrar taxa da plataforma (débito)
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id
    ) VALUES (
      product_record.user_id,
      'platform_fee',
      -platform_fee,
      NEW.currency,
      'Taxa da plataforma Kambafy (8%)',
      NEW.order_id
    );
    
    -- Registrar receita de venda (crédito)
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id
    ) VALUES (
      product_record.user_id,
      'sale_revenue',
      net_amount,
      NEW.currency,
      'Receita de venda (valor líquido após taxa)',
      NEW.order_id
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. Recalcular saldos de todos os usuários afetados
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
    SELECT COALESCE(SUM(amount), 0) INTO correct_balance
    FROM balance_transactions
    WHERE user_id = user_record.user_id;
    
    INSERT INTO customer_balances (user_id, balance, currency)
    VALUES (user_record.user_id, correct_balance, 'KZ')
    ON CONFLICT (user_id) DO UPDATE
    SET balance = correct_balance, updated_at = NOW();
  END LOOP;
END $$;
