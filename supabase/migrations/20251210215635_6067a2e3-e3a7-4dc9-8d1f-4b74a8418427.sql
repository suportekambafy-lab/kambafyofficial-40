
-- =====================================================
-- FIX CRÍTICO: Proteger tabela admin_users de acesso público
-- =====================================================

-- 1. Remover políticas antigas que podem ter brechas
DROP POLICY IF EXISTS "Only admins can view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Active admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin accounts" ON admin_users;

-- 2. Criar função SECURITY DEFINER mais segura para verificar admin
CREATE OR REPLACE FUNCTION public.is_authenticated_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  -- Primeiro verificar se há um usuário autenticado via Supabase Auth
  v_user_id := auth.uid();
  
  -- Se não há usuário autenticado, negar acesso
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Buscar email do usuário autenticado
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  
  IF v_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se é admin ativo
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = v_email 
    AND is_active = true
  );
END;
$$;

-- 3. Criar função para verificar super admin
CREATE OR REPLACE FUNCTION public.is_authenticated_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  
  IF v_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = v_email 
    AND is_active = true
    AND role = 'super_admin'
  );
END;
$$;

-- 4. Criar novas políticas RESTRITIVAS (não permissivas)
-- Apenas admins autenticados via JWT podem ver admin_users
CREATE POLICY "Authenticated admins can view admin_users"
ON admin_users FOR SELECT
TO authenticated
USING (public.is_authenticated_admin());

-- Super admins podem gerenciar todos os admins
CREATE POLICY "Super admins can manage admin accounts"
ON admin_users FOR ALL
TO authenticated
USING (public.is_authenticated_super_admin())
WITH CHECK (public.is_authenticated_super_admin());

-- 5. Garantir que anônimos NÃO têm acesso
-- (RLS já bloqueia por padrão, mas vamos ser explícitos)
REVOKE ALL ON admin_users FROM anon;
GRANT SELECT ON admin_users TO authenticated;

-- 6. Dar permissões às funções
GRANT EXECUTE ON FUNCTION public.is_authenticated_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated_super_admin() TO authenticated;
