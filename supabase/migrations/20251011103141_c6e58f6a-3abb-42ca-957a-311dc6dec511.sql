-- Atualizar trigger para cobrar 8% em vendas completas E pendentes
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
  -- Processar quando status é completed OU pending
  IF (NEW.status = 'completed' OR NEW.status = 'pending') 
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status)) THEN
    
    -- Buscar informações do produto
    SELECT user_id, name INTO product_record
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- Verificar se já existe transação platform_fee para este pedido
    IF EXISTS (
      SELECT 1 FROM public.balance_transactions 
      WHERE order_id = NEW.order_id AND type = 'platform_fee'
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Usar seller_commission se disponível (vendas novas com 8% já descontado)
    -- Senão, usar amount (vendas antigas - será descontado 8% aqui)
    gross_amount := COALESCE(
      NULLIF(NEW.seller_commission::numeric, 0),
      NEW.amount::numeric
    );
    
    -- Calcular taxa da plataforma (8%)
    platform_fee := gross_amount * 0.08;
    
    -- Registrar taxa da plataforma (débito) - SEMPRE que há venda
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
    
    -- NÃO criar sale_revenue aqui - será criado pela Edge Function após 3 dias
    
  END IF;
  
  RETURN NEW;
END;
$function$;