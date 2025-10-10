-- Remover política problemática que causa recursão infinita
DROP POLICY IF EXISTS "Super admins can manage all admin accounts" ON public.admin_users;

-- Criar função SECURITY DEFINER para verificar se usuário é super admin
-- Isso bypassa RLS e evita recursão
CREATE OR REPLACE FUNCTION public.is_super_admin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = user_email
    AND is_active = true 
    AND role = 'super_admin'
  );
$$;

-- Recriar política usando a função security definer
CREATE POLICY "Super admins can manage all admin accounts"
ON public.admin_users
FOR ALL
USING (public.is_super_admin(get_current_user_email()))
WITH CHECK (public.is_super_admin(get_current_user_email()));

-- Atualizar outras políticas que possam ter o mesmo problema
DROP POLICY IF EXISTS "Admin users can view admin data" ON public.admin_users;

CREATE POLICY "Admin users can view admin data"
ON public.admin_users
FOR SELECT
USING (public.is_super_admin(get_current_user_email()));

-- Atualizar políticas de permissões
DROP POLICY IF EXISTS "Super admins can manage permissions" ON public.admin_permissions;

CREATE POLICY "Super admins can manage permissions"
ON public.admin_permissions
FOR ALL
USING (public.is_super_admin(get_current_user_email()))
WITH CHECK (public.is_super_admin(get_current_user_email()));

-- Comentário explicativo
COMMENT ON FUNCTION public.is_super_admin IS 'Verifica se um email pertence a um super admin. Usa SECURITY DEFINER para evitar recursão infinita nas policies RLS.';