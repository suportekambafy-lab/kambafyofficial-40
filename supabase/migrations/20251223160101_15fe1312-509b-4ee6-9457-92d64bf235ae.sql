-- Criar admin Fina Augusto
INSERT INTO admin_users (email, full_name, role, is_active, password_hash)
VALUES (
  'augustonilzafina20@gmail.com',
  'Fina Augusto',
  'admin',
  true,
  crypt('Kambafyfina@', gen_salt('bf'))
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  updated_at = now();