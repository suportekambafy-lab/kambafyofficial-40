-- ================================================
-- CORREÇÃO DE SEGURANÇA: profiles e admin_users
-- ================================================

-- 1. Remover política pública insegura da tabela admin_users
DROP POLICY IF EXISTS "System can read admin users for authentication" ON public.admin_users;

-- 2. Garantir que RLS está ativo na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas públicas inseguras da tabela profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- 4. Criar política para que usuários vejam APENAS o próprio perfil
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 5. Política para usuários atualizarem apenas o próprio perfil
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Política para inserir perfil próprio
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 7. Garantir RLS ativo na tabela admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 8. Dropar função existente antes de recriar (correção do erro)
DROP FUNCTION IF EXISTS public.is_admin_user(text);

-- 9. Criar função SECURITY DEFINER para verificar admin (evita recursão)
CREATE OR REPLACE FUNCTION public.is_admin_user(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE email = check_email
    AND is_active = true
  )
$$;

-- 10. Políticas para admin_users - APENAS admins podem ler
DROP POLICY IF EXISTS "Admin users can view admin data" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can view admin_users" ON public.admin_users;
CREATE POLICY "Only admins can view admin_users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin_user(public.get_current_user_email()));

-- 11. Remover acesso anônimo às tabelas sensíveis
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.admin_users FROM anon;

-- 12. Garantir que apenas authenticated tem acesso
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.admin_users TO authenticated;

-- 13. Para admin_users, o service_role pode fazer tudo (edge functions)
GRANT ALL ON public.admin_users TO service_role;