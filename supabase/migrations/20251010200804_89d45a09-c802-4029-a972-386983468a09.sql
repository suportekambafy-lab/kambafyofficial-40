-- Permitir que admins vejam suas próprias permissões
CREATE POLICY "Admins can view their own permissions"
ON public.admin_permissions
FOR SELECT
TO authenticated
USING (
  admin_id IN (
    SELECT id FROM public.admin_users 
    WHERE email = get_current_user_email()
  )
);