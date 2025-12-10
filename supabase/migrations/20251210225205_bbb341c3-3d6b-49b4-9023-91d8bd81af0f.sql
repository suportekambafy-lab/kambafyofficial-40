-- =====================================================
-- FIX CRÍTICO: Proteger tabela profiles de acesso indevido
-- Garantir que usuários só possam ver seus próprios dados
-- =====================================================

-- 1. Remover políticas SELECT existentes que podem ter brechas
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- 2. Remover políticas UPDATE duplicadas para limpeza
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 3. Remover políticas INSERT duplicadas
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- 4. Remover política DELETE existente
DROP POLICY IF EXISTS "Users can delete own profile only" ON profiles;

-- 5. Criar nova política SELECT restritiva - usuário vê APENAS seu próprio perfil
CREATE POLICY "Users can view only their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 6. Criar política SELECT para admins via função SECURITY DEFINER
CREATE POLICY "Admins can view all profiles securely"
ON profiles FOR SELECT
TO authenticated
USING (public.is_authenticated_admin());

-- 7. Política INSERT - usuário só pode criar seu próprio perfil
CREATE POLICY "Users can create their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 8. Política UPDATE - usuário só pode atualizar seu próprio perfil
CREATE POLICY "Users can update only their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 9. Política UPDATE para admins
CREATE POLICY "Admins can update any profile securely"
ON profiles FOR UPDATE
TO authenticated
USING (public.is_authenticated_admin())
WITH CHECK (public.is_authenticated_admin());

-- 10. Política DELETE - apenas o próprio usuário
CREATE POLICY "Users can delete only their own profile"
ON profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 11. Revogar acesso de anônimos completamente
REVOKE ALL ON profiles FROM anon;

-- 12. Garantir que funções públicas existentes continuem funcionando
-- Essas funções já são SECURITY DEFINER e retornam apenas dados mínimos:
-- - get_seller_public_info(product_id) - retorna nome, avatar, business_name, country
-- - get_seller_basic_info(user_id) - retorna nome, avatar, business_name
-- Não precisam de alteração pois usam SECURITY DEFINER