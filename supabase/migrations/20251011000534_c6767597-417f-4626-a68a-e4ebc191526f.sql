-- ============================================================
-- CORREÇÃO COMPLETA DO SISTEMA DE SALDO
-- ============================================================
-- Esta migration corrige vendas antigas que não têm transações
-- de balance_transactions criadas pelo trigger
-- ============================================================

-- ETAPA 1: Criar transações retroativas para vendas sem transações
-- Identificar vendas completed sem balance_transactions

DO $$
DECLARE
  order_record RECORD;
  gross_amount NUMERIC;
  net_amount NUMERIC;
  fee_amount NUMERIC;
  seller_id UUID;
BEGIN
  -- Para cada venda completed sem transação sale_revenue
  FOR order_record IN 
    SELECT 
      o.id,
      o.order_id,
      o.amount,
      o.seller_commission,
      o.currency,
      o.created_at,
      p.user_id as seller_id,
      p.name as product_name
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE o.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM balance_transactions bt
        WHERE bt.order_id = o.order_id
          AND bt.type = 'sale_revenue'
      )
    ORDER BY o.created_at ASC
  LOOP
    -- Calcular valores
    -- Se seller_commission existe, usar ele (já tem desconto)
    -- Senão, usar amount e descontar 8%
    IF order_record.seller_commission IS NOT NULL AND order_record.seller_commission::numeric > 0 THEN
      gross_amount := order_record.seller_commission::numeric;
      net_amount := gross_amount * 0.92;  -- 92% do seller_commission
      fee_amount := gross_amount * 0.08;  -- 8% do seller_commission
    ELSE
      gross_amount := order_record.amount::numeric;
      net_amount := gross_amount * 0.92;  -- 92% do amount
      fee_amount := gross_amount * 0.08;  -- 8% do amount
    END IF;
    
    seller_id := order_record.seller_id;
    
    -- Criar transação de taxa da plataforma (8% negativo)
    INSERT INTO balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id,
      created_at
    ) VALUES (
      seller_id,
      'platform_fee',
      -fee_amount,
      'KZ',
      'Taxa da plataforma Kambafy (8%) - Correção retroativa',
      order_record.order_id,
      order_record.created_at
    );
    
    -- Criar transação de receita líquida (92% positivo)
    INSERT INTO balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id,
      created_at
    ) VALUES (
      seller_id,
      'sale_revenue',
      net_amount,
      'KZ',
      CONCAT('Receita de venda (valor líquido) - ', order_record.product_name, ' - Correção retroativa'),
      order_record.order_id,
      order_record.created_at
    );
    
    RAISE NOTICE 'Corrigida venda % - Bruto: %, Taxa: %, Líquido: %', 
      order_record.order_id, gross_amount, fee_amount, net_amount;
    
  END LOOP;
  
  RAISE NOTICE 'Correção de vendas antigas concluída!';
END $$;

-- ETAPA 2: Recalcular saldos de todos os usuários afetados
-- Atualizar customer_balances com base nas transações corretas

DO $$
DECLARE
  user_record RECORD;
  calculated_balance NUMERIC;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM balance_transactions 
    WHERE user_id IS NOT NULL
  LOOP
    -- Calcular saldo correto baseado em TODAS as transações
    SELECT COALESCE(SUM(amount), 0) INTO calculated_balance
    FROM balance_transactions
    WHERE user_id = user_record.user_id;
    
    -- Atualizar customer_balances
    UPDATE customer_balances
    SET 
      balance = calculated_balance,
      updated_at = NOW()
    WHERE user_id = user_record.user_id;
    
    -- Se não existe, criar
    IF NOT FOUND THEN
      INSERT INTO customer_balances (user_id, balance, currency)
      VALUES (user_record.user_id, calculated_balance, 'KZ');
    END IF;
    
    RAISE NOTICE 'Recalculado saldo para usuário % - Novo saldo: % KZ', 
      user_record.user_id, calculated_balance;
  END LOOP;
  
  RAISE NOTICE 'Recálculo de saldos concluído!';
END $$;