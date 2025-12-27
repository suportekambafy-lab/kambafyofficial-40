-- Corrigir generate_api_key para usar o schema correto da extensão (extensions)
-- e definir search_path para evitar aviso de "Function Search Path Mutable"
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- pgcrypto está instalado no schema "extensions" no Supabase
  RETURN 'kp_' || encode(extensions.gen_random_bytes(32), 'hex');
END;
$$;

-- Garantir que approve_partner use generate_api_key (já usa) e mantém search_path seguro
-- (recriar para forçar nova dependência/plan)
CREATE OR REPLACE FUNCTION public.approve_partner(partner_id uuid, admin_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  UPDATE public.partners 
  SET 
    status = 'approved',
    api_key = public.generate_api_key(),
    approved_at = now(),
    approved_by = admin_id,
    updated_at = now()
  WHERE id = partner_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partner not found';
  END IF;
END;
$$;