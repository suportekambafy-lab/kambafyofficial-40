-- CORREÇÃO CRÍTICA: Remover transações duplicadas e recalcular saldos

-- 1. Deletar transações duplicadas criadas às 10:37 de hoje
DELETE FROM balance_transactions
WHERE created_at >= '2025-10-12 10:37:00'
  AND created_at < '2025-10-12 10:38:00'
  AND type IN ('sale_revenue', 'platform_fee');

-- 2. Recalcular TODOS os saldos dos vendedores afetados
SELECT admin_recalculate_all_seller_balances();

-- 3. Corrigir o trigger para prevenir duplicatas futuras
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
    
    -- ✅ PREVENÇÃO DE DUPLICATAS: Verificar se já existe transação para este order_id
    IF EXISTS (
      SELECT 1 FROM public.balance_transactions 
      WHERE order_id = NEW.order_id 
      AND type IN ('platform_fee', 'sale_revenue')
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

-- Log da correção
COMMENT ON FUNCTION public.create_balance_transaction_on_sale IS 'Corrigido em 2025-10-12: Adiciona verificação de duplicatas antes de criar transações';