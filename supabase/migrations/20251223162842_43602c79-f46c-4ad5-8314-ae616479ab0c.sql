-- Atualizar função admin_process_refund para salvar ID e nome do admin
CREATE OR REPLACE FUNCTION public.admin_process_refund(
  p_refund_id uuid,
  p_action text,
  p_admin_email text,
  p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund RECORD;
  v_new_status TEXT;
  v_result JSONB;
  v_admin_id UUID;
  v_admin_name TEXT;
BEGIN
  -- Verificar se é admin ativo e buscar ID e nome
  SELECT id, full_name INTO v_admin_id, v_admin_name
  FROM admin_users 
  WHERE email = p_admin_email AND is_active = true;
  
  IF v_admin_id IS NULL THEN
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
  
  -- Atualizar refund_requests com info do admin
  UPDATE refund_requests
  SET 
    status = v_new_status, 
    admin_comment = p_comment, 
    processed_at = NOW(),
    processed_by_admin_id = v_admin_id,
    processed_by_admin_name = v_admin_name,
    updated_at = NOW()
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
    'success', true, 
    'refund_id', p_refund_id, 
    'new_status', v_new_status, 
    'action', p_action, 
    'admin', p_admin_email,
    'admin_name', v_admin_name
  );
  
  RETURN v_result;
END;
$$;