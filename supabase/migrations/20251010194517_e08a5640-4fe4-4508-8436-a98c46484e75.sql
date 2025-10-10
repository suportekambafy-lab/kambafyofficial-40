-- Função para atualizar permissões de um admin
CREATE OR REPLACE FUNCTION public.update_admin_permissions(
  p_admin_id uuid,
  p_permissions text[],
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
  -- Obter email do admin
  admin_email := COALESCE(p_admin_email, get_current_user_email());
  
  -- Verificar se é super admin
  IF NOT is_super_admin(admin_email) THEN
    RAISE EXCEPTION 'Access denied: Only super admins can update admin permissions';
  END IF;

  -- Verificar se o admin alvo existe
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  -- Remover todas as permissões antigas
  DELETE FROM public.admin_permissions WHERE admin_id = p_admin_id;

  -- Adicionar novas permissões
  IF array_length(p_permissions, 1) > 0 THEN
    INSERT INTO public.admin_permissions (admin_id, permission)
    SELECT p_admin_id, unnest(p_permissions);
  END IF;

  -- Registrar no log
  INSERT INTO public.admin_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    p_admin_id,
    'permissions_updated',
    'admin_user',
    p_admin_id,
    jsonb_build_object(
      'permissions', p_permissions,
      'updated_by', admin_email
    )
  );
END;
$$;