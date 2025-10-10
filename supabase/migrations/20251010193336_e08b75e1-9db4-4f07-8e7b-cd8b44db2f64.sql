-- Habilitar extensão pgcrypto para bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recriar função com correção
DROP FUNCTION IF EXISTS public.create_admin_user(text, text, text, admin_role, text[], text);

CREATE OR REPLACE FUNCTION public.create_admin_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role admin_role,
  p_permissions text[] DEFAULT ARRAY[]::text[],
  p_admin_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_admin_id uuid;
  admin_email text;
BEGIN
  -- Obter email do admin (do parâmetro ou da sessão)
  admin_email := COALESCE(p_admin_email, get_current_user_email());
  
  -- Verificar se é super admin
  IF NOT is_super_admin(admin_email) THEN
    RAISE EXCEPTION 'Access denied: Only super admins can create admin users';
  END IF;

  -- Verificar se o email já existe
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Admin user with this email already exists';
  END IF;

  -- Criar novo admin
  INSERT INTO public.admin_users (
    email,
    password_hash,
    full_name,
    role,
    is_active
  ) VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    p_full_name,
    p_role,
    true
  ) RETURNING id INTO new_admin_id;

  -- Adicionar permissões se fornecidas
  IF array_length(p_permissions, 1) > 0 THEN
    INSERT INTO public.admin_permissions (admin_id, permission)
    SELECT new_admin_id, unnest(p_permissions);
  END IF;

  -- Registrar no log
  INSERT INTO public.admin_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    new_admin_id,
    'admin_created',
    'admin_user',
    new_admin_id,
    jsonb_build_object(
      'email', p_email,
      'role', p_role,
      'created_by', admin_email
    )
  );

  RETURN new_admin_id;
END;
$$;