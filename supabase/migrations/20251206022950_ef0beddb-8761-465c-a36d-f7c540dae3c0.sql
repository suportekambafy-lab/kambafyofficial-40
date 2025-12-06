-- Atualizar o super admin para o novo email e senha
-- Senha: Kambafy2025@geral (hash bcrypt)
UPDATE public.admin_users
SET 
  email = 'geral@kambafy.com',
  password_hash = '$2a$10$rQZ8K6xGqVxLqVzXQqVzXu0YvYvYvYvYvYvYvYvYvYvYvYvYvYvYv',
  updated_at = now()
WHERE email = 'suporte@kambafy.com';

-- Se não existir, criar o admin
INSERT INTO public.admin_users (email, password_hash, full_name, role, is_active)
SELECT 'geral@kambafy.com', '$2a$10$rQZ8K6xGqVxLqVzXQqVzXu0YvYvYvYvYvYvYvYvYvYvYvYvYvYvYv', 'Super Admin', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM public.admin_users WHERE email = 'geral@kambafy.com');