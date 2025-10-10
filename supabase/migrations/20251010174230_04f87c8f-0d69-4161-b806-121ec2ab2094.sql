-- Criar enum para roles de admin
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin', 'support', 'moderator');

-- Adicionar coluna de role na tabela admin_users
ALTER TABLE public.admin_users 
ADD COLUMN role admin_role NOT NULL DEFAULT 'admin';

-- Atualizar o admin principal para super_admin
UPDATE public.admin_users 
SET role = 'super_admin' 
WHERE email = 'suporte@kambafy.com';

-- Criar tabela de permissões de admin
CREATE TABLE public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES public.admin_users(id),
  UNIQUE(admin_id, permission)
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Super admins podem gerenciar permissões
CREATE POLICY "Super admins can manage permissions"
ON public.admin_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true 
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true 
    AND role = 'super_admin'
  )
);

-- Atualizar policy da tabela admin_users para permitir que super admins gerenciem outros admins
DROP POLICY IF EXISTS "Admin users can manage admin accounts" ON public.admin_users;

CREATE POLICY "Super admins can manage all admin accounts"
ON public.admin_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true 
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true 
    AND role = 'super_admin'
  )
);

-- Função para verificar se admin tem permissão
CREATE OR REPLACE FUNCTION public.admin_has_permission(_admin_email TEXT, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users au
    LEFT JOIN public.admin_permissions ap ON au.id = ap.admin_id
    WHERE au.email = _admin_email
      AND au.is_active = true
      AND (
        au.role = 'super_admin' 
        OR ap.permission = _permission
        OR ap.permission = 'all'
      )
  );
$$;

-- Função para criar novo admin
CREATE OR REPLACE FUNCTION public.create_admin_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role admin_role DEFAULT 'admin',
  p_permissions TEXT[] DEFAULT ARRAY[]::TEXT[]
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
  -- Verificar se é super admin
  current_admin_email := get_current_user_email();
  
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = current_admin_email 
    AND is_active = true 
    AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
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

-- Comentários para documentação
COMMENT ON TYPE public.admin_role IS 'Roles de administrador: super_admin (acesso total), admin (gerenciamento geral), support (suporte), moderator (moderação)';
COMMENT ON TABLE public.admin_permissions IS 'Permissões específicas para cada administrador';
COMMENT ON FUNCTION public.create_admin_user IS 'Cria novo usuário admin com role e permissões específicas';