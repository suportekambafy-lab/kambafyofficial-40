
-- Adicionar coluna verified_by_name na tabela identity_verification
ALTER TABLE public.identity_verification 
ADD COLUMN IF NOT EXISTS verified_by_name text;

-- Atualizar função admin_update_identity_verification para salvar o nome do admin
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
  admin_name text;
BEGIN
  admin_email := COALESCE(p_admin_email, get_current_user_email());
  
  -- Buscar nome do admin
  SELECT full_name INTO admin_name 
  FROM public.admin_users 
  WHERE email = admin_email
  AND is_active = true;
  
  IF admin_name IS NULL THEN
    -- Se não encontrou admin ativo, usar o email como fallback para o nome
    IF NOT EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE email = admin_email
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Access denied: Admin privileges required for email %', admin_email;
    END IF;
    admin_name := admin_email;
  END IF;

  IF p_status = 'aprovado' THEN
    UPDATE public.identity_verification 
    SET 
      status = p_status,
      rejection_reason = NULL,
      verified_at = NOW(),
      verified_by = p_admin_id,
      verified_by_name = admin_name,
      updated_at = NOW()
    WHERE id = p_verification_id;
  ELSE
    UPDATE public.identity_verification 
    SET 
      status = p_status,
      rejection_reason = p_rejection_reason,
      verified_at = NOW(),
      verified_by = p_admin_id,
      verified_by_name = admin_name,
      updated_at = NOW()
    WHERE id = p_verification_id;
  END IF;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification not found';
  END IF;
END;
$$;
