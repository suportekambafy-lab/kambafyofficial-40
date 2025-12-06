-- Atualizar função create_refund_request para reutilizar registro existente se rejeitado
CREATE OR REPLACE FUNCTION public.create_refund_request(
  p_order_id TEXT,
  p_reason TEXT,
  p_buyer_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund_id UUID;
  v_existing_refund_id UUID;
  v_order RECORD;
  v_product RECORD;
  v_buyer_user_id UUID;
  v_seller_user_id UUID;
  v_refund_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar pedido
  SELECT * INTO v_order FROM orders WHERE order_id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;
  
  IF v_order.status != 'completed' THEN
    RAISE EXCEPTION 'Apenas pedidos concluídos podem solicitar reembolso';
  END IF;
  
  -- Buscar produto para obter o seller_user_id
  SELECT * INTO v_product FROM products WHERE id = v_order.product_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  
  v_seller_user_id := v_product.user_id;
  
  IF v_seller_user_id IS NULL THEN
    RAISE EXCEPTION 'Vendedor do produto não encontrado';
  END IF;
  
  -- Usar refund_deadline do pedido ou calcular (7 dias após a compra)
  v_refund_deadline := COALESCE(v_order.refund_deadline, v_order.created_at + INTERVAL '7 days');
  
  IF NOW() > v_refund_deadline THEN
    RAISE EXCEPTION 'Prazo de 7 dias para reembolso expirado';
  END IF;
  
  -- Verificar se já existe solicitação ATIVA (pendente ou aprovada)
  IF EXISTS (
    SELECT 1 FROM refund_requests 
    WHERE order_id = p_order_id 
    AND status IN ('pending', 'approved', 'approved_by_seller', 'approved_by_admin')
  ) THEN
    RAISE EXCEPTION 'Já existe uma solicitação de reembolso ativa para este pedido';
  END IF;
  
  -- Obter buyer_user_id
  v_buyer_user_id := auth.uid();
  IF v_buyer_user_id IS NULL AND p_buyer_email IS NOT NULL THEN
    SELECT user_id INTO v_buyer_user_id
    FROM profiles WHERE email = p_buyer_email;
  END IF;
  
  -- Verificar se existe um refund rejeitado para reutilizar
  SELECT id INTO v_existing_refund_id
  FROM refund_requests 
  WHERE order_id = p_order_id 
  AND status IN ('rejected_by_seller', 'rejected_by_admin', 'rejected', 'cancelled')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_existing_refund_id IS NOT NULL THEN
    -- ATUALIZAR registro existente ao invés de criar novo
    UPDATE refund_requests
    SET 
      reason = p_reason,
      status = 'pending',
      seller_comment = NULL,
      admin_comment = NULL,
      processed_at = NULL,
      updated_at = NOW()
    WHERE id = v_existing_refund_id;
    
    v_refund_id := v_existing_refund_id;
    
    -- Log da reabertura
    INSERT INTO refund_logs (
      refund_id, action, actor_id, actor_email, actor_role, comment, new_status
    ) VALUES (
      v_refund_id, 'reopened', v_buyer_user_id,
      COALESCE(p_buyer_email, v_order.customer_email), 'buyer', p_reason, 'pending'
    );
  ELSE
    -- Inserir nova solicitação apenas se não existe nenhuma
    INSERT INTO refund_requests (
      order_id, buyer_user_id, buyer_email, seller_user_id, product_id,
      amount, currency, reason, status, refund_deadline
    ) VALUES (
      p_order_id, v_buyer_user_id, COALESCE(p_buyer_email, v_order.customer_email),
      v_seller_user_id, v_order.product_id, v_order.amount::numeric,
      v_order.currency, p_reason, 'pending', v_refund_deadline
    ) RETURNING id INTO v_refund_id;
    
    -- Log da criação
    INSERT INTO refund_logs (
      refund_id, action, actor_id, actor_email, actor_role, comment, new_status
    ) VALUES (
      v_refund_id, 'created', v_buyer_user_id,
      COALESCE(p_buyer_email, v_order.customer_email), 'buyer', p_reason, 'pending'
    );
  END IF;
  
  -- Atualizar ordem com flag de reembolso ativo
  UPDATE orders SET has_active_refund = true WHERE order_id = p_order_id;
  
  RETURN v_refund_id;
END;
$$;

-- Limpar duplicados existentes: manter apenas o registro mais recente por order_id
WITH duplicates AS (
  SELECT id, order_id,
    ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY updated_at DESC) as rn
  FROM refund_requests
)
DELETE FROM refund_requests 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);