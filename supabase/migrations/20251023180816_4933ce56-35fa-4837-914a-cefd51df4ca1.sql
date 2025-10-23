-- ====================================
-- SISTEMA DE REEMBOLSOS - PARTE 3: FUNÇÕES VENDEDOR E ADMIN
-- ====================================

-- 1. FUNÇÃO: VENDEDOR PROCESSAR REEMBOLSO
CREATE OR REPLACE FUNCTION public.seller_process_refund(
  p_refund_id UUID,
  p_action TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_refund RECORD;
  v_new_status TEXT;
  v_result JSONB;
BEGIN
  SELECT * INTO v_refund FROM refund_requests WHERE id = p_refund_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de reembolso não encontrada';
  END IF;
  
  IF v_refund.seller_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o vendedor do produto pode processar este reembolso';
  END IF;
  
  IF v_refund.status != 'pending' THEN
    RAISE EXCEPTION 'Esta solicitação já foi processada';
  END IF;
  
  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Ação inválida';
  END IF;
  
  IF p_action = 'approve' THEN
    v_new_status := 'approved_by_seller';
  ELSE
    v_new_status := 'rejected_by_seller';
  END IF;
  
  UPDATE refund_requests
  SET status = v_new_status, seller_comment = p_comment, updated_at = NOW()
  WHERE id = p_refund_id;
  
  IF p_action = 'approve' THEN
    PERFORM complete_refund(p_refund_id);
  ELSE
    UPDATE orders SET has_active_refund = false WHERE order_id = v_refund.order_id;
  END IF;
  
  INSERT INTO refund_logs (refund_id, action, actor_id, actor_email, actor_role, comment, old_status, new_status)
  VALUES (
    p_refund_id,
    CASE WHEN p_action = 'approve' THEN 'seller_approved' ELSE 'seller_rejected' END,
    auth.uid(), get_current_user_email(), 'seller', p_comment, v_refund.status, v_new_status
  );
  
  v_result := jsonb_build_object(
    'success', true, 'refund_id', p_refund_id, 'new_status', v_new_status, 'action', p_action
  );
  
  RETURN v_result;
END;
$$;

-- 2. FUNÇÃO: ADMIN PROCESSAR REEMBOLSO
CREATE OR REPLACE FUNCTION public.admin_process_refund(
  p_refund_id UUID,
  p_action TEXT,
  p_admin_email TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_refund RECORD;
  v_new_status TEXT;
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = p_admin_email AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado: privilégios de administrador necessários';
  END IF;
  
  SELECT * INTO v_refund FROM refund_requests WHERE id = p_refund_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de reembolso não encontrada';
  END IF;
  
  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Ação inválida';
  END IF;
  
  IF p_action = 'approve' THEN
    v_new_status := 'approved_by_admin';
  ELSE
    v_new_status := 'rejected_by_admin';
  END IF;
  
  UPDATE refund_requests
  SET status = v_new_status, admin_comment = p_comment, updated_at = NOW()
  WHERE id = p_refund_id;
  
  IF p_action = 'approve' THEN
    PERFORM complete_refund(p_refund_id);
  ELSE
    UPDATE orders SET has_active_refund = false WHERE order_id = v_refund.order_id;
  END IF;
  
  INSERT INTO refund_logs (refund_id, action, actor_email, actor_role, comment, old_status, new_status)
  VALUES (
    p_refund_id,
    CASE WHEN p_action = 'approve' THEN 'admin_approved' ELSE 'admin_rejected' END,
    p_admin_email, 'admin', p_comment, v_refund.status, v_new_status
  );
  
  v_result := jsonb_build_object(
    'success', true, 'refund_id', p_refund_id, 'new_status', v_new_status, 
    'action', p_action, 'admin', p_admin_email
  );
  
  RETURN v_result;
END;
$$;

-- 3. TRIGGER: NOTIFICAÇÃO DE NOVOS REEMBOLSOS
CREATE OR REPLACE FUNCTION public.notify_new_refund()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO admin_notifications (type, title, message, entity_id, entity_type, data)
  VALUES (
    'refund_request',
    'Nova Solicitação de Reembolso',
    'Um cliente solicitou reembolso de ' || NEW.amount || ' ' || NEW.currency,
    NEW.id,
    'refund_request',
    jsonb_build_object(
      'order_id', NEW.order_id,
      'buyer_email', NEW.buyer_email,
      'amount', NEW.amount,
      'reason', NEW.reason
    )
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_refund_request_created ON public.refund_requests;
CREATE TRIGGER on_refund_request_created
  AFTER INSERT ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_refund();