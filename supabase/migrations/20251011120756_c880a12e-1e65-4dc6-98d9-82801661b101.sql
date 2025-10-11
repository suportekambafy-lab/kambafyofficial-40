-- ============================================
-- SIMPLIFICAÇÃO DO SISTEMA FINANCEIRO
-- Remove sistema de 3 dias, libera vendas imediatamente
-- ============================================

-- 1. Atualizar trigger para criar sale_revenue IMEDIATAMENTE
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
    
    -- Verificar se já existem transações para este pedido
    IF EXISTS (
      SELECT 1 FROM public.balance_transactions 
      WHERE order_id = NEW.order_id AND (type = 'platform_fee' OR type = 'sale_revenue')
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
    
    -- ✅ NOVO: Criar sale_revenue IMEDIATAMENTE (não espera mais 3 dias)
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

-- 2. Migração de dados: Liberar todas as vendas pendentes
-- Criar sale_revenue para vendas completed que não têm essa transação ainda
DO $$
DECLARE
  order_record RECORD;
  product_record RECORD;
  gross_amount NUMERIC;
  platform_fee NUMERIC;
  net_amount NUMERIC;
  processed_count INTEGER := 0;
BEGIN
  -- Buscar vendas completed sem sale_revenue
  FOR order_record IN 
    SELECT DISTINCT o.order_id, o.amount, o.seller_commission, o.currency, o.product_id
    FROM orders o
    WHERE o.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM balance_transactions bt
        WHERE bt.order_id = o.order_id 
          AND bt.type = 'sale_revenue'
      )
  LOOP
    -- Buscar user_id do produto
    SELECT user_id INTO product_record
    FROM products
    WHERE id = order_record.product_id;
    
    IF product_record.user_id IS NOT NULL THEN
      -- Calcular valores
      gross_amount := COALESCE(
        NULLIF(order_record.seller_commission::numeric, 0),
        order_record.amount::numeric
      );
      
      platform_fee := gross_amount * 0.08;
      net_amount := gross_amount - platform_fee;
      
      -- Verificar se já tem platform_fee
      IF NOT EXISTS (
        SELECT 1 FROM balance_transactions
        WHERE order_id = order_record.order_id AND type = 'platform_fee'
      ) THEN
        -- Criar platform_fee se não existir
        INSERT INTO balance_transactions (
          user_id, type, amount, currency, description, order_id
        ) VALUES (
          product_record.user_id,
          'platform_fee',
          -platform_fee,
          order_record.currency,
          'Taxa da plataforma Kambafy (8%)',
          order_record.order_id
        );
      END IF;
      
      -- Criar sale_revenue
      INSERT INTO balance_transactions (
        user_id, type, amount, currency, description, order_id
      ) VALUES (
        product_record.user_id,
        'sale_revenue',
        net_amount,
        order_record.currency,
        'Receita de venda (migração - liberação imediata)',
        order_record.order_id
      );
      
      processed_count := processed_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Migração concluída: % vendas pendentes liberadas', processed_count;
END $$;