-- Corrigir recursão infinita na tabela admin_users
-- Usar função SECURITY DEFINER para evitar recursão

-- 1. Remover políticas problemáticas que causam recursão
DROP POLICY IF EXISTS "Only active admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can view action logs" ON public.admin_action_logs;
DROP POLICY IF EXISTS "Only admins can view impersonation sessions" ON public.admin_impersonation_sessions;
DROP POLICY IF EXISTS "Only admins can view permissions" ON public.admin_permissions;

-- 2. Criar função SECURITY DEFINER para verificar se é admin ativo
CREATE OR REPLACE FUNCTION public.is_active_admin_by_auth_id()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    AND is_active = true
  )
$$;

-- 3. Criar função para verificar se é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin_by_auth_id()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    AND is_active = true
    AND role = 'super_admin'
  )
$$;

-- 4. Recriar políticas usando as funções SECURITY DEFINER
CREATE POLICY "Active admins can view admin users"
ON public.admin_users
FOR SELECT
USING (public.is_active_admin_by_auth_id());

CREATE POLICY "Active admins can view action logs"
ON public.admin_action_logs
FOR SELECT
USING (public.is_active_admin_by_auth_id());

CREATE POLICY "Super admins can view impersonation sessions"
ON public.admin_impersonation_sessions
FOR SELECT
USING (public.is_super_admin_by_auth_id());

CREATE POLICY "Active admins can view permissions"
ON public.admin_permissions
FOR SELECT
USING (public.is_active_admin_by_auth_id());

-- 5. Garantir que admins possam ver dados críticos para o dashboard
-- Profiles (para ver vendedores)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_active_admin_by_auth_id());

-- Orders (para ver pedidos/vendas)
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (public.is_active_admin_by_auth_id());

-- Products (para ver produtos)
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT
USING (public.is_active_admin_by_auth_id());

-- Checkout sessions (para estatísticas)
DROP POLICY IF EXISTS "Admins can view all checkout sessions" ON public.checkout_sessions;
CREATE POLICY "Admins can view all checkout sessions"
ON public.checkout_sessions
FOR SELECT
USING (public.is_active_admin_by_auth_id());

-- Refund requests (para disputas)
DROP POLICY IF EXISTS "Admins can view all refund requests" ON public.refund_requests;
CREATE POLICY "Admins can view all refund requests"
ON public.refund_requests
FOR SELECT
USING (public.is_active_admin_by_auth_id());

-- Withdrawal requests
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (public.is_active_admin_by_auth_id());