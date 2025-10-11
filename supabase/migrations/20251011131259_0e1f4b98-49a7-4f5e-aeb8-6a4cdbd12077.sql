-- Trigger para criar transações de balanço quando pagamento de módulo é completado
CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_module_payment()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_id UUID;
  gross_amount NUMERIC;
  platform_fee NUMERIC;
  net_amount NUMERIC;
BEGIN
  -- Processar quando status é completed
  IF (NEW.status = 'completed') 
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status)) THEN
    
    -- Buscar user_id do vendedor através da member_area
    SELECT ma.user_id INTO seller_id
    FROM public.member_areas ma
    WHERE ma.id = NEW.member_area_id;
    
    IF seller_id IS NULL THEN
      RAISE EXCEPTION 'Seller not found for member_area_id %', NEW.member_area_id;
    END IF;
    
    -- Verificar se já existem transações para este pagamento
    IF EXISTS (
      SELECT 1 FROM public.balance_transactions 
      WHERE order_id = NEW.order_id 
        AND (type = 'platform_fee' OR type = 'sale_revenue')
    ) THEN
      RETURN NEW;
    END IF;
    
    gross_amount := NEW.amount::numeric;
    platform_fee := gross_amount * 0.08;  -- 8% da plataforma
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
      seller_id,
      'platform_fee',
      -platform_fee,
      NEW.currency,
      'Taxa da plataforma Kambafy (8%) - Módulo',
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
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS module_payment_balance_transaction_trigger ON public.module_payments;
CREATE TRIGGER module_payment_balance_transaction_trigger
  AFTER INSERT OR UPDATE ON public.module_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_balance_transaction_on_module_payment();