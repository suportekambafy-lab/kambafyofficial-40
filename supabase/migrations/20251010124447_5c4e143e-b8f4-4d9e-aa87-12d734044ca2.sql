-- Atualizar função para registrar duas transações separadas (taxa + líquido)
-- com fallback para vendas antigas
CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_record RECORD;
  gross_amount NUMERIC;
  platform_fee NUMERIC;
  net_amount NUMERIC;
BEGIN
  -- Só processar quando status mudar para completed
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'completed')) THEN
    
    -- Buscar informações do produto
    SELECT user_id, name INTO product_record
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- Usar seller_commission se disponível (vendas novas com 8% já descontado)
    -- Senão, usar amount (vendas antigas - será descontado 8% aqui)
    gross_amount := COALESCE(
      NULLIF(NEW.seller_commission::numeric, 0),
      NEW.amount::numeric
    );
    
    -- Calcular taxa da plataforma (8%) e valor líquido (92%)
    platform_fee := gross_amount * 0.08;
    net_amount := gross_amount * 0.92;
    
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
    
    -- Registrar valor líquido para o vendedor (crédito)
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
      'Receita de venda (valor líquido)',
      NEW.order_id
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;