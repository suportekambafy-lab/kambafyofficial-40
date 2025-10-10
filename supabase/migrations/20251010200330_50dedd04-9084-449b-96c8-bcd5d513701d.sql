-- Recriar a função update_admin_permissions com logs de debug
-- usando a função is_super_admin que já existe
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
  is_super bool;
BEGIN
  -- Obter email do admin
  admin_email := COALESCE(p_admin_email, get_current_user_email());
  
  RAISE NOTICE 'Updating permissions - admin_email: %, target_admin_id: %, permissions: %', 
    admin_email, p_admin_id, p_permissions;
  
  -- Verificar se é super admin
  is_super := is_super_admin(admin_email);
  
  RAISE NOTICE 'Is super admin check: %', is_super;
  
  IF NOT is_super THEN
    RAISE EXCEPTION 'Access denied: Only super admins can update admin permissions (current user: %)', admin_email;
  END IF;

  -- Verificar se o admin alvo existe
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Admin user not found: %', p_admin_id;
  END IF;

  RAISE NOTICE 'Deleting old permissions for admin_id: %', p_admin_id;
  
  -- Remover todas as permissões antigas
  DELETE FROM public.admin_permissions WHERE admin_id = p_admin_id;

  RAISE NOTICE 'Adding new permissions: %', p_permissions;

  -- Adicionar novas permissões
  IF array_length(p_permissions, 1) > 0 THEN
    INSERT INTO public.admin_permissions (admin_id, permission, granted_by)
    SELECT 
      p_admin_id, 
      unnest(p_permissions),
      (SELECT id FROM public.admin_users WHERE email = admin_email LIMIT 1);
  END IF;

  RAISE NOTICE 'Permissions updated successfully';

  -- Registrar no log
  INSERT INTO public.admin_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    (SELECT id FROM public.admin_users WHERE email = admin_email LIMIT 1),
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