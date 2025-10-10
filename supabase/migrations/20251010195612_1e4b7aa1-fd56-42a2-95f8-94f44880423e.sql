-- Atualizar o admin 'suporte@kambafy.com' para super_admin
UPDATE public.admin_users
SET role = 'super_admin'
WHERE email = 'suporte@kambafy.com';