-- Remover função existente primeiro
DROP FUNCTION IF EXISTS public.create_admin_user(text, text, text, admin_role, text[], text);

-- Criar função para criar novo administrador
CREATE OR REPLACE FUNCTION public.create_admin_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role public.admin_role,
  p_permissions TEXT[],
  p_admin_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_admin_id UUID;
  perm TEXT;
BEGIN
  -- Verificar se quem está criando é super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = p_admin_email 
    AND role = 'super_admin'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Apenas Super Admins podem criar novos administradores';
  END IF;

  -- Verificar se o email já existe
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Já existe um administrador com este email';
  END IF;

  -- Criar o registro do admin
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

  -- Adicionar permissões
  IF p_permissions IS NOT NULL AND array_length(p_permissions, 1) > 0 THEN
    FOREACH perm IN ARRAY p_permissions
    LOOP
      INSERT INTO public.admin_permissions (admin_id, permission)
      VALUES (new_admin_id, perm);
    END LOOP;
  END IF;

  RETURN new_admin_id;
END;
$$;