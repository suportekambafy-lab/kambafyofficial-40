-- Corrigir políticas RLS do admin para serem PERMISSIVE

-- ============================================
-- ADMIN_LOGS
-- ============================================
DROP POLICY IF EXISTS "Admin users can view admin logs" ON admin_logs;
DROP POLICY IF EXISTS "Admin users can insert admin logs" ON admin_logs;

CREATE POLICY "Admin users can view admin logs"
ON admin_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = get_current_user_email()
    AND admin_users.is_active = true
  )
);

CREATE POLICY "Admin users can insert admin logs"
ON admin_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = get_current_user_email()
    AND admin_users.is_active = true
  )
);

-- ============================================
-- ADMIN_NOTIFICATIONS
-- ============================================
DROP POLICY IF EXISTS "Admin users can manage admin notifications" ON admin_notifications;

CREATE POLICY "Admin users can manage admin notifications"
ON admin_notifications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = get_current_user_email()
    AND admin_users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = get_current_user_email()
    AND admin_users.is_active = true
  )
);

-- ============================================
-- ADMIN_USERS
-- ============================================
DROP POLICY IF EXISTS "Admin users can manage admin accounts" ON admin_users;
DROP POLICY IF EXISTS "Admin users can view admin data" ON admin_users;

CREATE POLICY "Admin users can manage admin accounts"
ON admin_users
FOR ALL
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admin users can view admin data"
ON admin_users
FOR SELECT
USING (is_current_user_admin());

-- ============================================
-- IDENTITY_VERIFICATION (garantir que estão corretas)
-- ============================================
DROP POLICY IF EXISTS "Admins can view all identity verifications" ON identity_verification;

CREATE POLICY "Admins can view all identity verifications"
ON identity_verification
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = get_current_user_email()
    AND admin_users.is_active = true
  )
);