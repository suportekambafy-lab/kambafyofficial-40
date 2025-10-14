-- Adicionar política RLS para admins visualizarem todos os profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.email = get_current_user_email()
    AND admin_users.is_active = true
  )
);

-- Adicionar política RLS para admins atualizarem profiles (ban/unban)
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.email = get_current_user_email()
    AND admin_users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.email = get_current_user_email()
    AND admin_users.is_active = true
  )
);