-- Remover todas as versões de admin_approve_product especificando argumentos completos
DROP FUNCTION IF EXISTS public.admin_approve_product(product_id uuid, admin_id uuid);
DROP FUNCTION IF EXISTS public.admin_approve_product(product_id uuid, admin_id uuid, p_admin_email text);
DROP FUNCTION IF EXISTS public.admin_approve_product(product_id uuid, admin_id uuid, p_admin_email text, p_jwt_token text);

-- Recriar apenas a versão sem JWT
CREATE OR REPLACE FUNCTION public.admin_approve_product(
  product_id uuid,
  admin_id uuid DEFAULT NULL,
  p_admin_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email text;
BEGIN
  -- Obter email do admin (do parâmetro ou da sessão)
  admin_email := COALESCE(p_admin_email, get_current_user_email());
  
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required for email %', admin_email;
  END IF;

  -- Atualizar o produto diretamente (bypassa RLS)
  UPDATE public.products 
  SET 
    status = 'Ativo',
    admin_approved = true,
    revision_requested = false,
    revision_requested_at = null,
    updated_at = now()
  WHERE id = product_id;
  
  -- Verificar se a atualização foi bem-sucedida
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
END;
$$;

-- Remover versões duplicadas de admin_process_transfer_request
DROP FUNCTION IF EXISTS public.admin_process_transfer_request(p_transfer_id uuid, p_action text, p_jwt_token text);
DROP FUNCTION IF EXISTS public.admin_process_transfer_request(uuid, text, text);

-- Recriar apenas a versão sem JWT
CREATE OR REPLACE FUNCTION public.admin_process_transfer_request(
  p_transfer_id uuid,
  p_action text
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
  new_status := CASE WHEN p_action = 'approve' THEN 'completed' ELSE 'failed' END;
  
  SELECT * INTO order_record FROM public.orders WHERE id = p_transfer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  UPDATE public.orders 
  SET 
    status = new_status,
    updated_at = now()
  WHERE id = p_transfer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update order status';
  END IF;
  
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

-- Remover versões duplicadas de admin_update_identity_verification
DROP FUNCTION IF EXISTS public.admin_update_identity_verification(p_verification_id uuid, p_status text, p_rejection_reason text, p_admin_id uuid);
DROP FUNCTION IF EXISTS public.admin_update_identity_verification(p_verification_id uuid, p_status text, p_rejection_reason text, p_admin_id uuid, p_admin_email text);
DROP FUNCTION IF EXISTS public.admin_update_identity_verification(p_verification_id uuid, p_status text, p_rejection_reason text, p_admin_id uuid, p_admin_email text, p_jwt_token text);
DROP FUNCTION IF EXISTS public.admin_update_identity_verification(uuid, text, text, uuid, text, text);

-- Recriar apenas a versão sem JWT
CREATE OR REPLACE FUNCTION public.admin_update_identity_verification(
  p_verification_id uuid,
  p_status text,
  p_rejection_reason text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_admin_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email text;
BEGIN
  admin_email := COALESCE(p_admin_email, get_current_user_email());
  
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required for email %', admin_email;
  END IF;

  IF p_status = 'aprovado' THEN
    UPDATE public.identity_verification 
    SET 
      status = p_status,
      rejection_reason = NULL,
      verified_at = NOW(),
      verified_by = p_admin_id,
      updated_at = NOW()
    WHERE id = p_verification_id;
  ELSE
    UPDATE public.identity_verification 
    SET 
      status = p_status,
      rejection_reason = p_rejection_reason,
      verified_at = NULL,
      verified_by = NULL,
      updated_at = NOW()
    WHERE id = p_verification_id;
  END IF;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification not found';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.admin_approve_product IS 'Aprova produtos - SEM JWT';
COMMENT ON FUNCTION public.admin_process_transfer_request IS 'Processa transferências - SEM JWT';
COMMENT ON FUNCTION public.admin_update_identity_verification IS 'Atualiza verificação - SEM JWT';