-- Corrigir função create_refund_request para buscar seller_user_id do produto
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
  
  -- Usar user_id do produto como seller_user_id
  v_seller_user_id := v_product.user_id;
  
  IF v_seller_user_id IS NULL THEN
    RAISE EXCEPTION 'Vendedor do produto não encontrado';
  END IF;
  
  -- Calcular prazo de reembolso (7 dias após a compra)
  v_refund_deadline := v_order.created_at + INTERVAL '7 days';
  
  IF NOW() > v_refund_deadline THEN
    RAISE EXCEPTION 'Prazo de 7 dias para reembolso expirado';
  END IF;
  
  -- Verificar se já existe solicitação ativa
  IF EXISTS (
    SELECT 1 FROM refund_requests 
    WHERE order_id = p_order_id 
    AND status NOT IN ('rejected_by_seller', 'rejected_by_admin', 'cancelled')
  ) THEN
    RAISE EXCEPTION 'Já existe uma solicitação de reembolso ativa para este pedido';
  END IF;
  
  -- Obter buyer_user_id
  v_buyer_user_id := auth.uid();
  IF v_buyer_user_id IS NULL AND p_buyer_email IS NOT NULL THEN
    SELECT user_id INTO v_buyer_user_id
    FROM profiles WHERE email = p_buyer_email;
  END IF;
  
  -- Inserir solicitação de reembolso
  INSERT INTO refund_requests (
    order_id, buyer_user_id, buyer_email, seller_user_id, product_id,
    amount, currency, reason, status, refund_deadline
  ) VALUES (
    p_order_id, v_buyer_user_id, COALESCE(p_buyer_email, v_order.customer_email),
    v_seller_user_id, v_order.product_id, v_order.amount::numeric,
    v_order.currency, p_reason, 'pending', v_refund_deadline
  ) RETURNING id INTO v_refund_id;
  
  -- Atualizar ordem com flag de reembolso ativo
  UPDATE orders SET has_active_refund = true WHERE order_id = p_order_id;
  
  -- Log da criação
  INSERT INTO refund_logs (
    refund_id, action, actor_id, actor_email, actor_role, comment, new_status
  ) VALUES (
    v_refund_id, 'created', v_buyer_user_id,
    COALESCE(p_buyer_email, v_order.customer_email), 'buyer', p_reason, 'pending'
  );
  
  RETURN v_refund_id;
END;
$$;