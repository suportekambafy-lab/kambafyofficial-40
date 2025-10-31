-- Atualizar senha do admin Amado Ruben
-- Nova senha: Rubenadmin2025@

UPDATE admin_users 
SET 
  password_hash = crypt('Rubenadmin2025@', gen_salt('bf')),
  updated_at = now()
WHERE email = 'amadoruben203@gmail.com';