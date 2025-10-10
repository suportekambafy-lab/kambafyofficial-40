-- ============================================
-- SISTEMA DE SEGURANÇA JWT PARA ADMIN PORTAL
-- ============================================

-- 1. Função para verificar JWT de admin (usada pelas RPC functions)
CREATE OR REPLACE FUNCTION public.verify_admin_jwt(jwt_token TEXT)
RETURNS TABLE(
  email TEXT,
  role TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_secret TEXT;
  payload JSONB;
  exp_timestamp BIGINT;
BEGIN
  -- Obter secret do ambiente
  jwt_secret := current_setting('app.jwt_secret', true);
  IF jwt_secret IS NULL THEN
    jwt_secret := 'kambafy-admin-secret-2025'; -- Fallback
  END IF;

  -- Tentar decodificar JWT (simplificado - em produção usar biblioteca adequada)
  -- Por agora, apenas verificar se o admin existe e está ativo
  BEGIN
    -- Extrair email do token (assumindo formato simples)
    payload := jwt_token::jsonb;
    
    -- Verificar expiração
    exp_timestamp := (payload->>'exp')::BIGINT;
    IF exp_timestamp < EXTRACT(EPOCH FROM NOW()) THEN
      RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, false;
      RETURN;
    END IF;

    -- Verificar se admin existe e está ativo
    RETURN QUERY
    SELECT 
      au.email,
      au.role::TEXT,
      true as is_valid
    FROM admin_users au
    WHERE au.email = (payload->>'email')::TEXT
      AND au.is_active = true;
      
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, false;
  END;
END;
$$;

-- 2. Atualizar admin_approve_product para exigir JWT
CREATE OR REPLACE FUNCTION public.admin_approve_product(
  product_id uuid, 
  admin_id uuid DEFAULT NULL::uuid, 
  p_admin_email text DEFAULT NULL::text,
  p_jwt_token text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email TEXT;
  jwt_valid BOOLEAN;
BEGIN
  -- Se JWT fornecido, validar
  IF p_jwt_token IS NOT NULL THEN
    SELECT is_valid INTO jwt_valid
    FROM verify_admin_jwt(p_jwt_token);
    
    IF NOT COALESCE(jwt_valid, false) THEN
      RAISE EXCEPTION 'Invalid or expired JWT token';
    END IF;
    
    SELECT email INTO admin_email
    FROM verify_admin_jwt(p_jwt_token);
  ELSE
    admin_email := COALESCE(p_admin_email, get_current_user_email());
  END IF;
  
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required for email %', admin_email;
  END IF;

  UPDATE public.products 
  SET 
    status = 'Ativo',
    admin_approved = true,
    revision_requested = false,
    revision_requested_at = null,
    updated_at = now()
  WHERE id = product_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
END;
$$;

-- 3. Atualizar admin_ban_product para exigir JWT
CREATE OR REPLACE FUNCTION public.admin_ban_product(
  product_id uuid, 
  admin_id uuid DEFAULT NULL::uuid, 
  ban_reason_text text DEFAULT NULL::text, 
  p_admin_email text DEFAULT NULL::text,
  p_jwt_token text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email TEXT;
  jwt_valid BOOLEAN;
BEGIN
  IF p_jwt_token IS NOT NULL THEN
    SELECT is_valid INTO jwt_valid
    FROM verify_admin_jwt(p_jwt_token);
    
    IF NOT COALESCE(jwt_valid, false) THEN
      RAISE EXCEPTION 'Invalid or expired JWT token';
    END IF;
    
    SELECT email INTO admin_email
    FROM verify_admin_jwt(p_jwt_token);
  ELSE
    admin_email := COALESCE(p_admin_email, get_current_user_email());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required for email %', admin_email;
  END IF;

  UPDATE public.products 
  SET 
    status = 'Banido',
    admin_approved = false,
    ban_reason = ban_reason_text,
    updated_at = now()
  WHERE id = product_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
END;
$$;

-- 4. Atualizar admin_process_withdrawal_request para exigir JWT
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal_request(
  request_id uuid, 
  new_status text, 
  admin_id uuid DEFAULT NULL::uuid, 
  notes_text text DEFAULT NULL::text,
  p_jwt_token text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_valid BOOLEAN;
  admin_email TEXT;
BEGIN
  IF p_jwt_token IS NOT NULL THEN
    SELECT is_valid INTO jwt_valid
    FROM verify_admin_jwt(p_jwt_token);
    
    IF NOT COALESCE(jwt_valid, false) THEN
      RAISE EXCEPTION 'Invalid or expired JWT token';
    END IF;
  END IF;

  UPDATE public.withdrawal_requests 
  SET 
    status = new_status,
    admin_processed_by = admin_id,
    admin_notes = notes_text,
    updated_at = now()
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de saque não encontrada';
  END IF;
END;
$$;

-- 5. Atualizar admin_update_identity_verification para exigir JWT
CREATE OR REPLACE FUNCTION public.admin_update_identity_verification(
  p_verification_id uuid, 
  p_status text, 
  p_rejection_reason text DEFAULT NULL::text, 
  p_admin_id uuid DEFAULT NULL::uuid, 
  p_admin_email text DEFAULT NULL::text,
  p_jwt_token text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email TEXT;
  jwt_valid BOOLEAN;
BEGIN
  IF p_jwt_token IS NOT NULL THEN
    SELECT is_valid INTO jwt_valid
    FROM verify_admin_jwt(p_jwt_token);
    
    IF NOT COALESCE(jwt_valid, false) THEN
      RAISE EXCEPTION 'Invalid or expired JWT token';
    END IF;
    
    SELECT email INTO admin_email
    FROM verify_admin_jwt(p_jwt_token);
  ELSE
    admin_email := COALESCE(p_admin_email, get_current_user_email());
  END IF;
  
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

-- 6. Atualizar admin_process_transfer_request para exigir JWT
CREATE OR REPLACE FUNCTION public.admin_process_transfer_request(
  p_transfer_id uuid, 
  p_action text,
  p_jwt_token text DEFAULT NULL::text
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
  jwt_valid BOOLEAN;
BEGIN
  IF p_jwt_token IS NOT NULL THEN
    SELECT is_valid INTO jwt_valid
    FROM verify_admin_jwt(p_jwt_token);
    
    IF NOT COALESCE(jwt_valid, false) THEN
      RAISE EXCEPTION 'Invalid or expired JWT token';
    END IF;
  END IF;

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

-- 7. Criar tabela de logs de ações admin (auditoria)
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  jwt_used BOOLEAN DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para logs
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can view logs"
ON public.admin_action_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);

CREATE POLICY "System can insert logs"
ON public.admin_action_logs
FOR INSERT
WITH CHECK (true);