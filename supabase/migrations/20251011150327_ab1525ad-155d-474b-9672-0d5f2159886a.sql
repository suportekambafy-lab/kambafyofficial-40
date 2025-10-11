-- Adicionar Amado Ruben como admin com permissões específicas

-- Inserir admin na tabela admin_users
INSERT INTO public.admin_users (
  email,
  full_name,
  password_hash,
  role,
  is_active
) VALUES (
  'amadoruben203@gmail.com',
  'Amado Ruben',
  crypt('3344Codfy.', gen_salt('bf')),
  'admin',
  true
);

-- Inserir permissões específicas para o admin
DO $$
DECLARE
  admin_id_var UUID;
BEGIN
  -- Obter o ID do admin recém-criado
  SELECT id INTO admin_id_var 
  FROM public.admin_users 
  WHERE email = 'amadoruben203@gmail.com';
  
  -- Inserir as 4 permissões específicas
  INSERT INTO public.admin_permissions (admin_id, permission) VALUES
    (admin_id_var, 'manage_users'),
    (admin_id_var, 'manage_products'),
    (admin_id_var, 'view_analytics'),
    (admin_id_var, 'manage_verifications');
END $$;