
-- ================================================
-- CORREÇÃO CRÍTICA: Exposição de dados em orders, profiles e outras tabelas
-- ================================================

-- =============================================
-- 1. ORDERS: Remover acesso público a orders
-- =============================================

-- Remover a política problemática que expõe orders publicamente
DROP POLICY IF EXISTS "Enhanced order viewing policy" ON public.orders;

-- Criar política segura: apenas vendedor, comprador, afiliado ou admin
CREATE POLICY "Secure order viewing policy"
ON public.orders
FOR SELECT
TO authenticated
USING (
  -- Vendedor do produto
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = orders.product_id 
    AND products.user_id = auth.uid()
  )
  -- OU comprador (se tiver user_id)
  OR auth.uid() = user_id
  -- OU comprador (por email)
  OR get_current_user_email() = customer_email
  -- OU afiliado ativo da venda
  OR (
    affiliate_code IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.affiliate_code::text = orders.affiliate_code::text 
      AND a.affiliate_user_id = auth.uid() 
      AND a.status = 'ativo'
    )
  )
  -- OU admin autenticado
  OR EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = get_current_user_email() 
    AND admin_users.is_active = true
  )
);

-- Remover política duplicada de admin
DROP POLICY IF EXISTS "Admins with permission can view orders" ON public.orders;

-- Política para admins atualizarem orders
DROP POLICY IF EXISTS "Enable order updates" ON public.orders;

CREATE POLICY "Sellers and admins can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  -- Vendedor do produto
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = orders.product_id 
    AND products.user_id = auth.uid()
  )
  -- OU admin
  OR EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = get_current_user_email() 
    AND admin_users.is_active = true
  )
);

-- =============================================
-- 2. PROFILES: Limpar políticas duplicadas
-- =============================================

-- Remover políticas duplicadas/redundantes
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins with permission can view profiles" ON public.profiles;

-- Revogar acesso anónimo completamente
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.orders FROM anon;

-- =============================================
-- 3. ABANDONED_PURCHASES: Restringir acesso
-- =============================================

-- Remover política pública insegura
DROP POLICY IF EXISTS "System can manage abandoned purchases" ON public.abandoned_purchases;

-- Criar política segura para sistema via service_role apenas
CREATE POLICY "Service role can manage abandoned purchases"
ON public.abandoned_purchases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Revogar acesso anónimo
REVOKE ALL ON public.abandoned_purchases FROM anon;

-- =============================================
-- 4. FACEBOOK_EVENTS_LOG: Restringir acesso
-- =============================================

-- Remover política pública insegura
DROP POLICY IF EXISTS "System can manage event logs" ON public.facebook_events_log;

-- Criar política segura para sistema via service_role apenas
CREATE POLICY "Service role can manage facebook event logs"
ON public.facebook_events_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Revogar acesso anónimo
REVOKE ALL ON public.facebook_events_log FROM anon;

-- =============================================
-- 5. ADMIN_IMPERSONATION_SESSIONS: Restringir a super admins
-- =============================================

-- Remover política atual
DROP POLICY IF EXISTS "Admin users can view impersonation sessions" ON public.admin_impersonation_sessions;

-- Criar política restrita a super admins
CREATE POLICY "Only super admins can view impersonation sessions"
ON public.admin_impersonation_sessions
FOR SELECT
TO authenticated
USING (is_super_admin(get_current_user_email()));

-- Revogar acesso anónimo
REVOKE ALL ON public.admin_impersonation_sessions FROM anon;
