-- ====================================
-- SISTEMA DE REEMBOLSOS - PARTE 2: FUNÇÕES
-- ====================================

-- 1. FUNÇÃO: CRIAR SOLICITAÇÃO DE REEMBOLSO
CREATE OR REPLACE FUNCTION public.create_refund_request(
  p_order_id TEXT,
  p_reason TEXT,
  p_buyer_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_refund_id UUID;
  v_order RECORD;
  v_buyer_user_id UUID;
  v_refund_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE order_id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;
  
  IF v_order.status != 'completed' THEN
    RAISE EXCEPTION 'Apenas pedidos concluídos podem solicitar reembolso';
  END IF;
  
  v_refund_deadline := v_order.created_at + INTERVAL '7 days';
  
  IF NOW() > v_refund_deadline THEN
    RAISE EXCEPTION 'Prazo de 7 dias para reembolso expirado';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM refund_requests 
    WHERE order_id = p_order_id 
    AND status NOT IN ('rejected_by_seller', 'rejected_by_admin', 'cancelled')
  ) THEN
    RAISE EXCEPTION 'Já existe uma solicitação de reembolso ativa para este pedido';
  END IF;
  
  v_buyer_user_id := auth.uid();
  IF v_buyer_user_id IS NULL AND p_buyer_email IS NOT NULL THEN
    SELECT user_id INTO v_buyer_user_id
    FROM profiles WHERE email = p_buyer_email;
  END IF;
  
  INSERT INTO refund_requests (
    order_id, buyer_user_id, buyer_email, seller_user_id, product_id,
    amount, currency, reason, status, refund_deadline
  ) VALUES (
    p_order_id, v_buyer_user_id, COALESCE(p_buyer_email, v_order.customer_email),
    v_order.user_id, v_order.product_id, v_order.amount::numeric,
    v_order.currency, p_reason, 'pending', v_refund_deadline
  ) RETURNING id INTO v_refund_id;
  
  UPDATE orders SET has_active_refund = true WHERE order_id = p_order_id;
  
  INSERT INTO refund_logs (
    refund_id, action, actor_id, actor_email, actor_role, comment, new_status
  ) VALUES (
    v_refund_id, 'created', v_buyer_user_id,
    COALESCE(p_buyer_email, v_order.customer_email), 'buyer', p_reason, 'pending'
  );
  
  RETURN v_refund_id;
END;
$$;

-- 2. FUNÇÃO: COMPLETAR REEMBOLSO (LÓGICA FINANCEIRA)
CREATE OR REPLACE FUNCTION public.complete_refund(p_refund_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_refund RECORD;
BEGIN
  SELECT * INTO v_refund FROM refund_requests WHERE id = p_refund_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reembolso não encontrado';
  END IF;
  
  INSERT INTO balance_transactions (user_id, type, amount, currency, description, order_id)
  VALUES (
    v_refund.seller_user_id, 'refund_debit', -v_refund.amount, v_refund.currency,
    'Reembolso processado - Pedido: ' || v_refund.order_id, v_refund.order_id
  );
  
  IF v_refund.buyer_user_id IS NOT NULL THEN
    INSERT INTO balance_transactions (user_id, type, amount, currency, description, order_id)
    VALUES (
      v_refund.buyer_user_id, 'refund_credit', v_refund.amount, v_refund.currency,
      'Reembolso recebido - Pedido: ' || v_refund.order_id, v_refund.order_id
    );
  END IF;
  
  UPDATE refund_requests
  SET status = 'completed', processed_at = NOW(), updated_at = NOW()
  WHERE id = p_refund_id;
  
  UPDATE orders
  SET status = 'refunded', has_active_refund = false, updated_at = NOW()
  WHERE order_id = v_refund.order_id;
  
  UPDATE customer_access
  SET is_active = false, updated_at = NOW()
  WHERE order_id = v_refund.order_id;
  
  INSERT INTO refund_logs (refund_id, action, actor_email, actor_role, comment, old_status, new_status)
  VALUES (p_refund_id, 'completed', 'system', 'system', 'Reembolso processado com sucesso', v_refund.status, 'completed');
END;
$$;