-- Remover policies antigas
DROP POLICY IF EXISTS "Admins with permission can view products" ON public.products;
DROP POLICY IF EXISTS "Admins with permission can update products" ON public.products;
DROP POLICY IF EXISTS "Admins with permission can view orders" ON public.orders;
DROP POLICY IF EXISTS "Admins with permission can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins with permission can view withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins with permission can update withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins with permission can view verifications" ON public.identity_verification;
DROP POLICY IF EXISTS "Admins with permission can update verifications" ON public.identity_verification;
DROP POLICY IF EXISTS "Admins with permission can view profiles" ON public.profiles;

-- Remover função antiga
DROP FUNCTION IF EXISTS public.admin_has_permission(TEXT, TEXT);

-- Criar função helper para verificar permissões específicas de admin
CREATE FUNCTION public.admin_has_permission(admin_email TEXT, required_permission TEXT)
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

-- Products
CREATE POLICY "Admins with permission can view products" ON public.products
  FOR SELECT USING (admin_has_permission(get_current_user_email(), 'manage_products'));

CREATE POLICY "Admins with permission can update products" ON public.products
  FOR UPDATE USING (admin_has_permission(get_current_user_email(), 'manage_products'));

-- Orders
CREATE POLICY "Admins with permission can view orders" ON public.orders
  FOR SELECT USING (admin_has_permission(get_current_user_email(), 'manage_orders'));

CREATE POLICY "Admins with permission can update orders" ON public.orders
  FOR UPDATE USING (admin_has_permission(get_current_user_email(), 'manage_orders'));

-- Withdrawals
CREATE POLICY "Admins with permission can view withdrawals" ON public.withdrawal_requests
  FOR SELECT USING (admin_has_permission(get_current_user_email(), 'manage_withdrawals'));

CREATE POLICY "Admins with permission can update withdrawals" ON public.withdrawal_requests
  FOR UPDATE USING (admin_has_permission(get_current_user_email(), 'manage_withdrawals'));

-- Verifications
CREATE POLICY "Admins with permission can view verifications" ON public.identity_verification
  FOR SELECT USING (admin_has_permission(get_current_user_email(), 'manage_verifications'));

CREATE POLICY "Admins with permission can update verifications" ON public.identity_verification
  FOR UPDATE 
  USING (admin_has_permission(get_current_user_email(), 'manage_verifications'))
  WITH CHECK (admin_has_permission(get_current_user_email(), 'manage_verifications'));

-- Profiles
CREATE POLICY "Admins with permission can view profiles" ON public.profiles
  FOR SELECT USING (admin_has_permission(get_current_user_email(), 'manage_users'));