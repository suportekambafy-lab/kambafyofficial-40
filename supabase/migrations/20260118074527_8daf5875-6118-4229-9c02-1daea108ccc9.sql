-- FIX CRÍTICO: withdrawal_requests policy referenciando admin_users diretamente
-- Isso causa 403 para vendedores autenticados

-- Dropar policies problemáticas
DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can create own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "withdrawal_requests_select_policy" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "withdrawal_requests_insert_policy" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "withdrawal_requests_update_policy" ON public.withdrawal_requests;

-- Recriar policy de SELECT para usuários (sem referência a admin_users)
CREATE POLICY "Users can view own withdrawal requests" ON public.withdrawal_requests
FOR SELECT TO authenticated
USING (
  -- Usuário vê seus próprios saques
  auth.uid() = user_id
  -- OU é admin (via função SECURITY DEFINER)
  OR public.is_authenticated_admin()
);

-- Policy de INSERT para usuários
CREATE POLICY "Users can create own withdrawal requests" ON public.withdrawal_requests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy de UPDATE para admins (via função SECURITY DEFINER)
CREATE POLICY "Admins can update withdrawal requests" ON public.withdrawal_requests
FOR UPDATE TO authenticated
USING (public.is_authenticated_admin())
WITH CHECK (public.is_authenticated_admin());