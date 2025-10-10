-- Atualizar função create_admin_user para aceitar email do admin que está criando
CREATE OR REPLACE FUNCTION public.create_admin_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role admin_role DEFAULT 'admin',
  p_permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_admin_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_admin_id UUID;
  permission TEXT;
  current_admin_email TEXT;
BEGIN
  -- Obter email do admin (do parâmetro ou da sessão)
  current_admin_email := COALESCE(p_admin_email, get_current_user_email());
  
  -- Verificar se é super admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = current_admin_email 
    AND is_active = true 
    AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required for email %', current_admin_email;
  END IF;

  -- Verificar se admin já existe
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Admin with this email already exists';
  END IF;

  -- Criar novo admin
  INSERT INTO public.admin_users (email, password_hash, full_name, role, is_active)
  VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    p_full_name,
    p_role,
    true
  )
  RETURNING id INTO new_admin_id;

  -- Adicionar permissões
  FOREACH permission IN ARRAY p_permissions
  LOOP
    INSERT INTO public.admin_permissions (admin_id, permission, granted_by)
    VALUES (
      new_admin_id,
      permission,
      (SELECT id FROM public.admin_users WHERE email = current_admin_email)
    );
  END LOOP;

  RETURN new_admin_id;
END;
$$;