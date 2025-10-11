-- Remover função antiga e criar nova versão
DROP FUNCTION IF EXISTS public.admin_has_permission(TEXT, TEXT);

-- Criar função helper para verificar permissões específicas de admin
CREATE OR REPLACE FUNCTION public.admin_has_permission(admin_email TEXT, required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admins têm todas as permissões
  IF EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = admin_email 
      AND role = 'super_admin' 
      AND is_active = true
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar se o admin tem a permissão específica
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_users au
    JOIN public.admin_permissions ap ON au.id = ap.admin_id
    WHERE au.email = admin_email
      AND au.is_active = true
      AND ap.permission = required_permission
  );
END;
$$;

-- Atualizar RLS policies para usar verificação de permissões

-- Products: apenas admins com permissão 'manage_products'
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
CREATE POLICY "Admins with permission can view products" ON public.products
  FOR SELECT
  USING (
    admin_has_permission(get_current_user_email(), 'manage_products')
  );

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins with permission can update products" ON public.products
  FOR UPDATE
  USING (
    admin_has_permission(get_current_user_email(), 'manage_products')
  );

-- Orders: apenas admins com permissão 'manage_orders'
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins with permission can view orders" ON public.orders
  FOR SELECT
  USING (
    admin_has_permission(get_current_user_email(), 'manage_orders')
  );

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins with permission can update orders" ON public.orders
  FOR UPDATE
  USING (
    admin_has_permission(get_current_user_email(), 'manage_orders')
  );

-- Withdrawal requests: apenas admins com permissão 'manage_withdrawals'
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins with permission can view withdrawals" ON public.withdrawal_requests
  FOR SELECT
  USING (
    admin_has_permission(get_current_user_email(), 'manage_withdrawals')
  );

DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins with permission can update withdrawals" ON public.withdrawal_requests
  FOR UPDATE
  USING (
    admin_has_permission(get_current_user_email(), 'manage_withdrawals')
  );

-- Identity verification: apenas admins com permissão 'manage_verifications'
DROP POLICY IF EXISTS "Admins can view all identity verifications" ON public.identity_verification;
CREATE POLICY "Admins with permission can view verifications" ON public.identity_verification
  FOR SELECT
  USING (
    admin_has_permission(get_current_user_email(), 'manage_verifications')
  );

DROP POLICY IF EXISTS "Admins can update all identity verifications" ON public.identity_verification;
CREATE POLICY "Admins with permission can update verifications" ON public.identity_verification
  FOR UPDATE
  USING (
    admin_has_permission(get_current_user_email(), 'manage_verifications')
  )
  WITH CHECK (
    admin_has_permission(get_current_user_email(), 'manage_verifications')
  );

-- Profiles: apenas admins com permissão 'manage_users'
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins with permission can view profiles" ON public.profiles
  FOR SELECT
  USING (
    admin_has_permission(get_current_user_email(), 'manage_users')
  );

-- Admin logs: apenas super admins podem ver
DROP POLICY IF EXISTS "Admin users can view admin logs" ON public.admin_logs;
CREATE POLICY "Only super admins can view admin logs" ON public.admin_logs
  FOR SELECT
  USING (
    is_super_admin(get_current_user_email())
  );

DROP POLICY IF EXISTS "Admin users can insert admin logs" ON public.admin_logs;
CREATE POLICY "Only super admins can insert admin logs" ON public.admin_logs
  FOR INSERT
  WITH CHECK (
    is_super_admin(get_current_user_email())
  );

-- Admin notifications: todos os admins podem ver notificações
DROP POLICY IF EXISTS "Admin users can manage admin notifications" ON public.admin_notifications;
CREATE POLICY "All active admins can view notifications" ON public.admin_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = get_current_user_email()
        AND is_active = true
    )
  );

CREATE POLICY "All active admins can update notifications" ON public.admin_notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = get_current_user_email()
        AND is_active = true
    )
  );

COMMENT ON FUNCTION public.admin_has_permission IS 'Verifica se um admin tem uma permissão específica. Super admins sempre retornam TRUE.';