-- Corrigir TODAS as vendas completed que não têm transações corretas

DO $$
DECLARE
  order_record RECORD;
  seller_id UUID;
  gross_amount NUMERIC;
  net_amount NUMERIC;
  fee_amount NUMERIC;
  has_fee BOOLEAN;
  has_revenue BOOLEAN;
  wrong_revenue_amount NUMERIC;
  fixed_count INTEGER := 0;
  already_correct_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 Iniciando correção de vendas antigas...';
  
  FOR order_record IN 
    SELECT 
      o.id,
      o.order_id,
      o.amount,
      o.seller_commission,
      o.currency,
      o.created_at,
      p.user_id as seller_user_id
    FROM orders o
    INNER JOIN products p ON p.id = o.product_id
    WHERE o.status = 'completed'
    ORDER BY o.created_at
  LOOP
    seller_id := order_record.seller_user_id;
    gross_amount := order_record.amount::NUMERIC;
    net_amount := COALESCE(order_record.seller_commission::NUMERIC, gross_amount * 0.9101);
    fee_amount := gross_amount - net_amount;
    
    -- Verificar transações existentes
    SELECT EXISTS(
      SELECT 1 FROM balance_transactions 
      WHERE order_id = order_record.order_id 
      AND user_id = seller_id 
      AND type = 'platform_fee'
    ) INTO has_fee;
    
    SELECT EXISTS(
      SELECT 1 FROM balance_transactions 
      WHERE order_id = order_record.order_id 
      AND user_id = seller_id 
      AND type = 'sale_revenue'
    ) INTO has_revenue;
    
    -- Se já tem ambas, pular
    IF has_fee AND has_revenue THEN
      already_correct_count := already_correct_count + 1;
      CONTINUE;
    END IF;
    
    RAISE NOTICE '🔧 Corrigindo order_id: %', order_record.order_id;
    
    -- Criar platform_fee se não existir
    IF NOT has_fee THEN
      INSERT INTO balance_transactions (
        user_id, type, amount, currency, description, order_id, created_at
      ) VALUES (
        seller_id,
        'platform_fee',
        -fee_amount,
        COALESCE(order_record.currency, 'KZ'),
        'Taxa da plataforma (8.99%)',
        order_record.order_id,
        order_record.created_at
      )
      ON CONFLICT (user_id, order_id, type) DO NOTHING;
    END IF;
    
    -- Verificar se tem revenue com valor errado (bruto)
    SELECT amount INTO wrong_revenue_amount
    FROM balance_transactions
    WHERE order_id = order_record.order_id
      AND user_id = seller_id
      AND type = 'sale_revenue'
      AND ABS(amount - gross_amount) < 0.01;
    
    -- Se tem revenue incorreto, deletar
    IF wrong_revenue_amount IS NOT NULL THEN
      DELETE FROM balance_transactions
      WHERE order_id = order_record.order_id
        AND user_id = seller_id
        AND type = 'sale_revenue'
        AND amount = wrong_revenue_amount;
      
      has_revenue := FALSE;
    END IF;
    
    -- Criar sale_revenue correto se não existir
    IF NOT has_revenue THEN
      INSERT INTO balance_transactions (
        user_id, type, amount, currency, description, order_id, created_at
      ) VALUES (
        seller_id,
        'sale_revenue',
        net_amount,
        COALESCE(order_record.currency, 'KZ'),
        'Receita de venda (valor líquido após taxa de 8.99%)',
        order_record.order_id,
        order_record.created_at
      )
      ON CONFLICT (user_id, order_id, type) DO NOTHING;
    END IF;
    
    fixed_count := fixed_count + 1;
  END LOOP;
  
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '✅ CORREÇÃO CONCLUÍDA';
  RAISE NOTICE 'Vendas já corretas: %', already_correct_count;
  RAISE NOTICE 'Vendas corrigidas: %', fixed_count;
  RAISE NOTICE '══════════════════════════════════════════════════';
  
  -- Recalcular saldos de todos os vendedores afetados
  RAISE NOTICE '💰 Recalculando saldos...';
  
  FOR seller_id IN 
    SELECT DISTINCT user_id 
    FROM balance_transactions 
    WHERE user_id IS NOT NULL
  LOOP
    UPDATE customer_balances
    SET balance = (
      SELECT COALESCE(SUM(amount), 0)
      FROM balance_transactions
      WHERE user_id = seller_id
    ),
    updated_at = NOW()
    WHERE user_id = seller_id;
  END LOOP;
  
  RAISE NOTICE '✅ Saldos recalculados!';
END;
$$;