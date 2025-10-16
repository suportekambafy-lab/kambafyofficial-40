-- Adicionar política para admins poderem atualizar admin_approved
CREATE POLICY "Admins can update admin_approved field"
ON public.products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);