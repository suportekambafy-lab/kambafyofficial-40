-- ============================================
-- CORREÇÃO: Taxa de 8.99% já descontada no seller_commission
-- O saldo deve receber exatamente o valor líquido
-- ============================================

-- 1️⃣ Corrigir trigger para VENDAS NORMAIS
CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  product_record RECORD;
  net_amount NUMERIC;
BEGIN
  -- ✅ Processar APENAS quando status é 'completed'
  IF (NEW.status = 'completed') 
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status)) THEN
    
    -- Buscar informações do produto
    SELECT user_id, name INTO product_record
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- ✅ Verificar se já existem transações (evitar duplicatas)
    IF EXISTS (
      SELECT 1 FROM public.balance_transactions 
      WHERE order_id = NEW.order_id AND type = 'sale_revenue'
    ) THEN
      RETURN NEW;
    END IF;
    
    -- ✅ Usar seller_commission DIRETO (taxa de 8.99% JÁ FOI DESCONTADA)
    -- Se não existir seller_commission, calcular na hora
    net_amount := COALESCE(
      NULLIF(NEW.seller_commission::numeric, 0),
      (NEW.amount::numeric * 0.9101) -- Fallback: 8.99% de desconto
    );
    
    -- ✅ Registrar APENAS a receita líquida (SEM descontar taxa adicional)
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
      net_amount, -- Valor líquido direto no saldo
      NEW.currency,
      'Receita de venda (valor líquido após taxa de 8.99%)',
      NEW.order_id
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2️⃣ Corrigir trigger para MÓDULOS
CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_module_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  seller_id UUID;
  gross_amount NUMERIC;
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
      WHERE order_id = NEW.order_id AND type = 'sale_revenue'
    ) THEN
      RETURN NEW;
    END IF;
    
    gross_amount := NEW.amount::numeric;
    net_amount := gross_amount * 0.9101;  -- 8.99% de taxa
    
    -- ✅ Registrar APENAS receita líquida (SEM taxa adicional)
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
      net_amount, -- Valor líquido direto no saldo
      NEW.currency,
      'Receita de venda de módulo (valor líquido após taxa de 8.99%)',
      NEW.order_id
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3️⃣ Corrigir trigger para KAMBAPAY
-- Atualizar função process-kambapay-payment para usar mesmo padrão
COMMENT ON FUNCTION public.create_balance_transaction_on_sale() IS 
'Taxa de 8.99% já descontada no seller_commission. Saldo recebe valor líquido direto.';