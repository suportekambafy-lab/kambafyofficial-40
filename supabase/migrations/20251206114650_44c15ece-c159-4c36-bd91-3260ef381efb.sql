-- Criar a ordem da venda MBway que não foi registrada
-- Payment Intent: pi_3SbHfjGfoQ3QRz9A09QERTGG
-- Produto: Rainha Leads- Seja um Gestor de Trafego pago
-- Vendedora: user_id = 82dfd59f-d45e-41ef-a02d-5b2ee843cf62
-- Valor: €17.26

DO $$
DECLARE
  v_order_id TEXT;
  v_seller_user_id UUID := '82dfd59f-d45e-41ef-a02d-5b2ee843cf62';
  v_product_id UUID := '0962f42f-8900-4285-bcd1-d1b40d34a9ef';
  v_amount NUMERIC := 17.26;
  v_currency TEXT := 'EUR';
  v_seller_commission NUMERIC;
  v_platform_fee NUMERIC;
BEGIN
  -- Gerar order_id único
  v_order_id := 'STRIPE-MBWAY-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
  
  -- Calcular comissões (8.99% para plataforma)
  v_platform_fee := ROUND(v_amount * 0.0899, 2);
  v_seller_commission := v_amount - v_platform_fee;
  
  -- Verificar se já existe ordem com este payment_intent
  IF NOT EXISTS (
    SELECT 1 FROM orders WHERE stripe_payment_intent_id = 'pi_3SbHfjGfoQ3QRz9A09QERTGG'
  ) THEN
    -- Inserir a ordem
    INSERT INTO orders (
      order_id,
      product_id,
      customer_email,
      customer_name,
      amount,
      currency,
      status,
      payment_method,
      stripe_payment_intent_id,
      user_id,
      seller_commission,
      created_at
    ) VALUES (
      v_order_id,
      v_product_id,
      'cliente_mbway@stripe.com', -- Placeholder - pode ser atualizado com email real
      'Cliente MBway',
      v_amount::TEXT,
      v_currency,
      'paid',
      'mbway',
      'pi_3SbHfjGfoQ3QRz9A09QERTGG',
      v_seller_user_id,
      v_seller_commission,
      '2025-12-06 10:00:00+00' -- Data aproximada do pagamento
    );
    
    -- Adicionar saldo ao vendedor usando tipo correto 'sale_revenue'
    INSERT INTO balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id
    ) VALUES (
      v_seller_user_id,
      'sale_revenue',
      v_seller_commission,
      v_currency,
      'Venda via MBway - Rainha Leads- Seja um Gestor de Trafego pago',
      v_order_id
    );
    
    RAISE NOTICE 'Ordem criada: % - Comissão vendedor: % EUR', v_order_id, v_seller_commission;
  ELSE
    RAISE NOTICE 'Ordem já existe para este payment_intent';
  END IF;
END;
$$;