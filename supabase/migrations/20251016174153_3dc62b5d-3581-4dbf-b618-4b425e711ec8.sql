-- Atualizar senha do admin amadoruben203@gmail.com no auth.users
UPDATE auth.users 
SET 
  encrypted_password = crypt('Admin@2025', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'amadoruben203@gmail.com';