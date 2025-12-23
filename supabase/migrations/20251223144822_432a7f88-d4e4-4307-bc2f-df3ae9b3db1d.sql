-- Habilitar extensão pgcrypto se não existir
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Criar admin Miriam Paquissi
INSERT INTO admin_users (email, full_name, password_hash, role, is_active)
VALUES (
  'Paquissimiriam03@gmail.com',
  'Miriam Paquissi',
  crypt('Kambafymiriam@', gen_salt('bf')),
  'admin',
  true
);

-- Criar usuário no auth.users para RLS funcionar
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'Paquissimiriam03@gmail.com',
  crypt('Kambafymiriam@', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Miriam Paquissi"}'::jsonb,
  now(),
  now(),
  'authenticated',
  'authenticated'
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'Paquissimiriam03@gmail.com'
);