
-- Remover as políticas RLS problemáticas que causam recursão infinita
DROP POLICY IF EXISTS "Admin users can view admin users" ON public.admin_users;

-- Desabilitar RLS temporariamente para admin_users já que estamos usando autenticação customizada
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Garantir que o usuário admin existe
INSERT INTO public.admin_users (email, password_hash, full_name, is_active) 
VALUES ('suporte@kambafy.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Suporte Kambafy', true)
ON CONFLICT (email) DO UPDATE SET
  is_active = true,
  updated_at = now();
