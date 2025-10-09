-- Atualizar função para aceitar email do admin como parâmetro
CREATE OR REPLACE FUNCTION public.admin_update_identity_verification(
  p_verification_id UUID,
  p_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_email TEXT;
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

  -- Atualizar verificação
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