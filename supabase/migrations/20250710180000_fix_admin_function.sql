
-- Criar função para buscar admin user sem políticas RLS
CREATE OR REPLACE FUNCTION public.get_admin_user(admin_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    id,
    email,
    full_name,
    is_active,
    created_at,
    updated_at
  FROM public.admin_users 
  WHERE email = admin_email 
    AND is_active = true
  LIMIT 1;
$$;

-- Garantir que existe um usuário admin
INSERT INTO public.admin_users (email, password_hash, full_name, is_active) 
VALUES ('suporte@kambafy.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Suporte Kambafy', true)
ON CONFLICT (email) DO UPDATE SET
  is_active = true,
  updated_at = now();
