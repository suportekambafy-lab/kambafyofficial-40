-- Atualizar função admin_approve_product para salvar quem aprovou
CREATE OR REPLACE FUNCTION public.admin_approve_product(product_id uuid, admin_id uuid DEFAULT NULL, p_admin_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email text;
  v_admin_name text;
  v_admin_id uuid;
BEGIN
  -- Obter email do admin (do parâmetro ou da sessão)
  admin_email := COALESCE(p_admin_email, get_current_user_email());
  
  -- Verificar se é admin e buscar ID e nome
  SELECT au.id, au.full_name INTO v_admin_id, v_admin_name
  FROM public.admin_users au
  WHERE au.email = admin_email AND au.is_active = true;
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required for email %', admin_email;
  END IF;

  -- Atualizar o produto diretamente (bypassa RLS) com info do admin
  UPDATE public.products 
  SET 
    status = 'Ativo',
    admin_approved = true,
    revision_requested = false,
    revision_requested_at = null,
    approved_by_admin_id = v_admin_id,
    approved_by_admin_name = v_admin_name,
    updated_at = now()
  WHERE id = product_id;
  
  -- Verificar se a atualização foi bem-sucedida
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
END;
$$;

-- Atualizar função admin_ban_product para salvar quem baniu
CREATE OR REPLACE FUNCTION public.admin_ban_product(
  product_id uuid, 
  admin_id uuid DEFAULT NULL, 
  ban_reason_text text DEFAULT NULL, 
  p_admin_email text DEFAULT NULL, 
  p_jwt_token text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email TEXT;
  jwt_valid RECORD;
  v_admin_id UUID;
  v_admin_name TEXT;
BEGIN
  -- Se JWT fornecido, validar primeiro
  IF p_jwt_token IS NOT NULL THEN
    SELECT * INTO jwt_valid FROM public.verify_admin_jwt(p_jwt_token);
    
    IF NOT jwt_valid.is_valid THEN
      RAISE EXCEPTION 'JWT inválido ou expirado';
    END IF;
    
    admin_email := jwt_valid.email;
  ELSE
    -- Fallback para email fornecido (compatibilidade)
    admin_email := COALESCE(p_admin_email, get_current_user_email());
  END IF;
  
  -- Verificar se é admin e buscar ID e nome
  SELECT au.id, au.full_name INTO v_admin_id, v_admin_name
  FROM public.admin_users au
  WHERE au.email = admin_email AND au.is_active = true;
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required for email %', admin_email;
  END IF;

  -- Atualizar o produto com info do admin que baniu
  UPDATE public.products 
  SET 
    status = 'Banido',
    admin_approved = false,
    ban_reason = ban_reason_text,
    banned_by_admin_id = v_admin_id,
    banned_by_admin_name = v_admin_name,
    updated_at = now()
  WHERE id = product_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  
  -- Registrar ação no log de auditoria
  INSERT INTO public.admin_action_logs (
    admin_email,
    action,
    target_type,
    target_id,
    jwt_used,
    details
  ) VALUES (
    admin_email,
    'product_ban',
    'product',
    product_id,
    (p_jwt_token IS NOT NULL),
    jsonb_build_object(
      'ban_reason', ban_reason_text,
      'admin_id', v_admin_id,
      'admin_name', v_admin_name
    )
  );
END;
$$;

-- Atualizar função admin_process_transfer_request para salvar quem aprovou
CREATE OR REPLACE FUNCTION public.admin_process_transfer_request(p_transfer_id uuid, p_action text, p_admin_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status text;
  v_admin_email text;
  v_admin_id uuid;
  v_admin_name text;
BEGIN
  v_admin_email := COALESCE(p_admin_email, get_current_user_email());
  
  -- Buscar ID e nome do admin
  SELECT id, full_name INTO v_admin_id, v_admin_name
  FROM admin_users
  WHERE email = v_admin_email AND is_active = true;
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin não encontrado ou inativo';
  END IF;
  
  IF p_action = 'approve' THEN
    v_new_status := 'completed';
  ELSIF p_action = 'reject' THEN
    v_new_status := 'failed';
  ELSE
    RAISE EXCEPTION 'Ação inválida: %', p_action;
  END IF;
  
  UPDATE orders
  SET 
    status = v_new_status,
    approved_by_admin_id = v_admin_id,
    approved_by_admin_name = v_admin_name,
    updated_at = NOW()
  WHERE id = p_transfer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_status', v_new_status,
    'admin_name', v_admin_name
  );
END;
$$;