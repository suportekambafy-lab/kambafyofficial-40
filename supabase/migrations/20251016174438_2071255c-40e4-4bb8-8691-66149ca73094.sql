-- Atualizar senha do admin na tabela admin_users
UPDATE admin_users
SET 
  password_hash = crypt('Admin@2025', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'amadoruben203@gmail.com';