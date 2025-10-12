-- REVERSÃO COMPLETA: Restaurar banco de dados ao estado ANTES da mudança 8% → 8.99%
-- Data de referência: 2025-10-12 10:28:00

-- ETAPA 1: Deletar TODAS as transações criadas após 10:28:00
DELETE FROM balance_transactions
WHERE created_at >= '2025-10-12 10:28:00';

-- ETAPA 2: Deletar as 2 vendas "reference" criadas após 10:28:00
DELETE FROM orders
WHERE order_id IN ('895210586', '397682768')
  AND created_at >= '2025-10-12 10:28:00';

-- ETAPA 3: Deletar pedidos de saque criados após 10:28:00
DELETE FROM withdrawal_requests
WHERE created_at >= '2025-10-12 10:28:00';

-- ETAPA 4: Restaurar trigger create_balance_transaction_on_sale com taxa de 8%
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
  IF (NEW.status = 'completed') 
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status)) THEN
    
    SELECT user_id INTO product_record
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- Prevenção de duplicatas
    IF EXISTS (
      SELECT 1 FROM public.balance_transactions 
      WHERE order_id = NEW.order_id 
      AND type IN ('platform_fee', 'sale_revenue')
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Se seller_commission existe, usar direto
    IF NEW.seller_commission IS NOT NULL AND NEW.seller_commission > 0 THEN
      net_amount := NEW.seller_commission::numeric;
      gross_amount := NEW.amount::numeric;
      platform_fee := gross_amount - net_amount;
    ELSE
      -- Calcular com taxa de 8%
      gross_amount := NEW.amount::numeric;
      platform_fee := gross_amount * 0.08;
      net_amount := gross_amount - platform_fee;
    END IF;
    
    INSERT INTO public.balance_transactions (
      user_id, type, amount, currency, description, order_id
    ) VALUES (
      product_record.user_id,
      'platform_fee',
      -platform_fee,
      NEW.currency,
      'Taxa da plataforma Kambafy (8%)',
      NEW.order_id
    );
    
    INSERT INTO public.balance_transactions (
      user_id, type, amount, currency, description, order_id
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

-- ETAPA 5: Restaurar trigger create_balance_transaction_on_module_payment com taxa de 8%
CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_module_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  seller_id UUID;
  gross_amount NUMERIC;
  platform_fee NUMERIC;
  net_amount NUMERIC;
BEGIN
  IF (NEW.status = 'completed') 
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status)) THEN
    
    SELECT ma.user_id INTO seller_id
    FROM public.member_areas ma
    WHERE ma.id = NEW.member_area_id;
    
    IF seller_id IS NULL THEN
      RAISE EXCEPTION 'Seller not found for member_area_id %', NEW.member_area_id;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM public.balance_transactions 
      WHERE order_id = NEW.order_id 
        AND (type = 'platform_fee' OR type = 'sale_revenue')
    ) THEN
      RETURN NEW;
    END IF;
    
    gross_amount := NEW.amount::numeric;
    platform_fee := gross_amount * 0.08;
    net_amount := gross_amount - platform_fee;
    
    INSERT INTO public.balance_transactions (
      user_id, type, amount, currency, description, order_id
    ) VALUES (
      seller_id,
      'platform_fee',
      -platform_fee,
      NEW.currency,
      'Taxa da plataforma Kambafy (8%) - Módulo',
      NEW.order_id
    );
    
    INSERT INTO public.balance_transactions (
      user_id, type, amount, currency, description, order_id
    ) VALUES (
      seller_id,
      'sale_revenue',
      net_amount,
      NEW.currency,
      'Receita de venda de módulo (valor líquido após taxa)',
      NEW.order_id
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ETAPA 6: Recalcular TODOS os saldos dos vendedores
SELECT admin_recalculate_all_seller_balances();

-- ETAPA 7: Adicionar comentários de log
COMMENT ON FUNCTION public.create_balance_transaction_on_sale IS 
'Restaurado em 2025-10-12 às 10:58 - Revertido para taxa de 8% (estado antes da migration 20251012102825)';

COMMENT ON FUNCTION public.create_balance_transaction_on_module_payment IS 
'Restaurado em 2025-10-12 às 10:58 - Revertido para taxa de 8% (estado antes da migration 20251012102825)';