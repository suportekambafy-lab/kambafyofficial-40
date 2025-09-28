-- Criar função específica para admin processar transferências
CREATE OR REPLACE FUNCTION public.admin_process_transfer_request(
  p_transfer_id uuid,
  p_action text -- 'approve' ou 'reject'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_data json;
  order_record RECORD;
  new_status text;
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Definir novo status
  new_status := CASE WHEN p_action = 'approve' THEN 'completed' ELSE 'failed' END;
  
  -- Buscar dados do pedido
  SELECT * INTO order_record FROM public.orders WHERE id = p_transfer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;
  
  -- Atualizar status diretamente
  UPDATE public.orders 
  SET 
    status = new_status,
    updated_at = now()
  WHERE id = p_transfer_id;
  
  -- Verificar se foi atualizado
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar status do pedido';
  END IF;
  
  -- Retornar dados atualizados
  result_data := json_build_object(
    'success', true,
    'order_id', order_record.order_id,
    'old_status', order_record.status,
    'new_status', new_status,
    'updated_at', now()
  );
  
  RETURN result_data;
END;
$$;