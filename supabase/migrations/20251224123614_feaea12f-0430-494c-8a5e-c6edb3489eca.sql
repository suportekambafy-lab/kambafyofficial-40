-- Corrigir função admin_update_identity_verification para salvar verified_by_name corretamente
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
  admin_name text;
  actual_admin_id uuid;
BEGIN
  -- Buscar admin_id e nome do admin
  IF p_admin_email IS NOT NULL THEN
    SELECT id, COALESCE(full_name, email) INTO actual_admin_id, admin_name 
    FROM public.admin_users 
    WHERE email = p_admin_email
    AND is_active = true;
  ELSIF p_admin_id IS NOT NULL THEN
    SELECT id, COALESCE(full_name, email) INTO actual_admin_id, admin_name 
    FROM public.admin_users 
    WHERE id = p_admin_id
    AND is_active = true;
  END IF;
  
  IF actual_admin_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  UPDATE public.identity_verification 
  SET 
    status = p_status,
    rejection_reason = CASE WHEN p_status = 'rejeitado' THEN p_rejection_reason ELSE NULL END,
    verified_at = NOW(),
    verified_by = actual_admin_id,
    verified_by_name = admin_name,
    updated_at = NOW()
  WHERE id = p_verification_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification not found';
  END IF;
END;
$$;

-- Atualizar registros antigos que têm verified_by mas não têm verified_by_name
UPDATE identity_verification iv
SET verified_by_name = COALESCE(au.full_name, au.email)
FROM admin_users au
WHERE iv.verified_by = au.id
AND iv.verified_by_name IS NULL
AND iv.status IN ('aprovado', 'rejeitado');