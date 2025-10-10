-- Criar função RPC para buscar permissões de admin com SECURITY DEFINER
-- Isso bypassa RLS e permite que o sistema de admin funcione corretamente
CREATE OR REPLACE FUNCTION public.get_admin_permissions(
  p_admin_id uuid,
  p_admin_email text DEFAULT NULL
)
RETURNS TABLE(permission text, granted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email text;
  is_super bool;
BEGIN
  -- Obter email do admin que está fazendo a consulta
  admin_email := p_admin_email;
  
  -- Verificar se é super admin ou o próprio admin consultando suas permissões
  is_super := is_super_admin(admin_email);
  
  -- Admin pode ver suas próprias permissões OU super admin pode ver qualquer permissão
  IF NOT is_super THEN
    -- Verificar se está consultando suas próprias permissões
    IF NOT EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = p_admin_id AND email = admin_email
    ) THEN
      RAISE EXCEPTION 'Access denied: Can only view your own permissions';
    END IF;
  END IF;

  -- Retornar permissões
  RETURN QUERY
  SELECT ap.permission, ap.granted_at
  FROM public.admin_permissions ap
  WHERE ap.admin_id = p_admin_id
  ORDER BY ap.granted_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_admin_permissions IS 'Busca permissões de um admin - bypassa RLS para funcionar com sistema de auth customizado';