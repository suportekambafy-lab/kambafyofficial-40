
-- ATUALIZAR FUNÇÃO DE REEMBOLSO PARA COBRAR TAXA DA PLATAFORMA
-- Quando reembolso é feito, vendedor paga: valor_reembolso + 8.99% (taxa da plataforma)

CREATE OR REPLACE FUNCTION public.complete_refund(p_refund_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_refund RECORD;
  v_platform_fee NUMERIC;
  v_total_seller_debit NUMERIC;
  v_platform_fee_rate NUMERIC := 0.0899; -- 8.99%
BEGIN
  SELECT * INTO v_refund FROM refund_requests WHERE id = p_refund_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reembolso não encontrado';
  END IF;
  
  -- Calcular taxa da plataforma (8.99% do valor reembolsado)
  v_platform_fee := ROUND(v_refund.amount * v_platform_fee_rate, 2);
  
  -- Total a debitar do vendedor = valor reembolso + taxa plataforma
  v_total_seller_debit := v_refund.amount + v_platform_fee;
  
  -- 1. Debitar o valor do reembolso do vendedor
  INSERT INTO balance_transactions (user_id, type, amount, currency, description, order_id)
  VALUES (
    v_refund.seller_user_id, 
    'refund_debit', 
    -v_refund.amount, 
    v_refund.currency,
    'Reembolso processado - Pedido: ' || v_refund.order_id, 
    v_refund.order_id
  );
  
  -- 2. Debitar a taxa da plataforma (8.99%) do vendedor
  INSERT INTO balance_transactions (user_id, type, amount, currency, description, order_id)
  VALUES (
    v_refund.seller_user_id, 
    'platform_fee_refund', 
    -v_platform_fee, 
    v_refund.currency,
    'Taxa plataforma (8.99%) - Reembolso pedido: ' || v_refund.order_id, 
    v_refund.order_id
  );
  
  -- 3. Creditar o valor ao comprador (se tiver user_id)
  IF v_refund.buyer_user_id IS NOT NULL THEN
    INSERT INTO balance_transactions (user_id, type, amount, currency, description, order_id)
    VALUES (
      v_refund.buyer_user_id, 
      'refund_credit', 
      v_refund.amount, 
      v_refund.currency,
      'Reembolso recebido - Pedido: ' || v_refund.order_id, 
      v_refund.order_id
    );
  END IF;
  
  -- 4. Atualizar status do reembolso
  UPDATE refund_requests
  SET status = 'completed', processed_at = NOW(), updated_at = NOW()
  WHERE id = p_refund_id;
  
  -- 5. Atualizar status do pedido
  UPDATE orders
  SET status = 'refunded', has_active_refund = false, updated_at = NOW()
  WHERE order_id = v_refund.order_id;
  
  -- 6. Revogar acesso do cliente
  UPDATE customer_access
  SET is_active = false, updated_at = NOW()
  WHERE order_id = v_refund.order_id;
  
  -- 7. Log do reembolso com informação da taxa
  INSERT INTO refund_logs (refund_id, action, actor_email, actor_role, comment, old_status, new_status)
  VALUES (
    p_refund_id, 
    'completed', 
    'system', 
    'system', 
    'Reembolso: ' || v_refund.amount || ' + Taxa plataforma: ' || v_platform_fee || ' = Total debitado: ' || v_total_seller_debit, 
    v_refund.status, 
    'completed'
  );
END;
$$;
