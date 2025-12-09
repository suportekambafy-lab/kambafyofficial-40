-- =============================================
-- PROTEÇÃO ADICIONAL - TABELAS DE ADMIN
-- =============================================

-- 1. ADMIN_USERS - Proteger credenciais de admin
DROP POLICY IF EXISTS "Anyone can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users are viewable by everyone" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;

-- Apenas admins autenticados podem ver (usando função segura)
CREATE POLICY "Only active admins can view admin users"
ON public.admin_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND au.is_active = true
  )
);

-- 2. ADMIN_IMPERSONATION_SESSIONS - Proteger logs de impersonação
DROP POLICY IF EXISTS "Anyone can view impersonation sessions" ON public.admin_impersonation_sessions;
DROP POLICY IF EXISTS "Impersonation sessions are viewable by everyone" ON public.admin_impersonation_sessions;

-- Apenas super admins podem ver
CREATE POLICY "Only admins can view impersonation sessions"
ON public.admin_impersonation_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND au.is_active = true
    AND au.role = 'super_admin'
  )
);

-- 3. ADMIN_ACTION_LOGS - Proteger logs de ações
DROP POLICY IF EXISTS "Anyone can view admin logs" ON public.admin_action_logs;

CREATE POLICY "Only admins can view action logs"
ON public.admin_action_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND au.is_active = true
  )
);

-- 4. ADMIN_PERMISSIONS - Proteger permissões
DROP POLICY IF EXISTS "Anyone can view admin permissions" ON public.admin_permissions;

CREATE POLICY "Only admins can view permissions"
ON public.admin_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND au.is_active = true
  )
);

-- 5. IDENTITY_VERIFICATION - Proteger documentos de identidade
DROP POLICY IF EXISTS "Anyone can view identity verification" ON public.identity_verification;
DROP POLICY IF EXISTS "Users can view all verifications" ON public.identity_verification;

-- Usuários só veem sua própria verificação
CREATE POLICY "Users can view own verification"
ON public.identity_verification
FOR SELECT
USING (auth.uid() = user_id);

-- 6. AFFILIATES - Proteger dados de afiliados  
DROP POLICY IF EXISTS "Anyone can view affiliates" ON public.affiliates;

-- Donos do produto podem ver afiliados
CREATE POLICY "Product owners can view affiliates"
ON public.affiliates
FOR SELECT
USING (auth.uid() = user_id);

-- Afiliados podem ver seus próprios registros
CREATE POLICY "Affiliates can view own records"
ON public.affiliates
FOR SELECT
USING (auth.uid() = affiliate_user_id);