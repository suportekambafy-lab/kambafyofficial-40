-- Inserir usuário admin na tabela admin_users
INSERT INTO public.admin_users (email, full_name, password_hash, is_active)
VALUES ('suporte@kambafy.com', 'Administrador Kambafy', 'admin_hash', true)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;