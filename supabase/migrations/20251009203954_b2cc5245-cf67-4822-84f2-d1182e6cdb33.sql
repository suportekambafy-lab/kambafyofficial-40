-- Remover políticas restritivas antigas
DROP POLICY IF EXISTS "Users can update their own identity verification" ON identity_verification;
DROP POLICY IF EXISTS "Admins can update all identity verifications" ON identity_verification;

-- Criar novas políticas PERMISSIVAS para UPDATE
CREATE POLICY "Users can update their own identity verification"
ON identity_verification
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all identity verifications"
ON identity_verification
FOR UPDATE
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