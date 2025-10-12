-- Atualizar taxa de plataforma de 8% para 8.99%

-- 1. Atualizar trigger de vendas normais
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
    
    IF EXISTS (
      SELECT 1 FROM public.balance_transactions 
      WHERE order_id = NEW.order_id 
      AND (type = 'platform_fee' OR type = 'sale_revenue')
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Se seller_commission existe, usar DIRETO (não aplicar desconto duplo)
    IF NEW.seller_commission IS NOT NULL AND NEW.seller_commission > 0 THEN
      net_amount := NEW.seller_commission::numeric;
      gross_amount := NEW.amount::numeric;
      platform_fee := gross_amount - net_amount;
    ELSE
      -- Vendas antigas sem seller_commission: calcular com nova taxa de 8.99%
      gross_amount := NEW.amount::numeric;
      platform_fee := gross_amount * 0.0899;
      net_amount := gross_amount - platform_fee;
    END IF;
    
    INSERT INTO public.balance_transactions (
      user_id, type, amount, currency, description, order_id
    ) VALUES (
      product_record.user_id,
      'platform_fee',
      -platform_fee,
      NEW.currency,
      'Taxa da plataforma Kambafy (8.99%)',
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

-- 2. Atualizar trigger de pagamentos de módulos
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
    platform_fee := gross_amount * 0.0899;  -- 8.99%
    net_amount := gross_amount - platform_fee;
    
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id
    ) VALUES (
      seller_id,
      'platform_fee',
      -platform_fee,
      NEW.currency,
      'Taxa da plataforma Kambafy (8.99%) - Módulo',
      NEW.order_id
    );
    
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id
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