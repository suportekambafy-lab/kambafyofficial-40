-- Criar função para reabrir solicitação de reembolso (atualiza existente em vez de criar nova)
CREATE OR REPLACE FUNCTION public.reopen_refund_request(
  p_order_id TEXT,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_refund_id UUID;
  v_order RECORD;
  v_refund_deadline TIMESTAMP WITH TIME ZONE;
  v_buyer_email TEXT;
BEGIN
  -- Buscar pedido
  SELECT * INTO v_order FROM orders WHERE order_id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;
  
  -- Verificar prazo
  v_refund_deadline := COALESCE(v_order.refund_deadline, v_order.created_at + INTERVAL '7 days');
  
  IF NOW() > v_refund_deadline THEN
    RAISE EXCEPTION 'Prazo de 7 dias para reembolso expirado';
  END IF;
  
  v_buyer_email := v_order.customer_email;
  
  -- Buscar reembolso rejeitado existente
  SELECT id INTO v_refund_id 
  FROM refund_requests 
  WHERE order_id = p_order_id 
  AND status IN ('rejected_by_seller', 'rejected_by_admin', 'rejected', 'cancelled')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_refund_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum reembolso rejeitado encontrado para este pedido';
  END IF;
  
  -- Atualizar o reembolso existente
  UPDATE refund_requests
  SET 
    reason = p_reason,
    status = 'pending',
    seller_comment = NULL,
    admin_comment = NULL,
    updated_at = NOW()
  WHERE id = v_refund_id;
  
  -- Atualizar ordem com flag de reembolso ativo
  UPDATE orders SET has_active_refund = true WHERE order_id = p_order_id;
  
  -- Log da reabertura
  INSERT INTO refund_logs (
    refund_id, action, actor_email, actor_role, comment, new_status
  ) VALUES (
    v_refund_id, 'reopened', v_buyer_email, 'buyer', p_reason, 'pending'
  );
  
  RETURN v_refund_id;
END;
$$;