-- Resetar senha do admin Amado Ruben
-- Nova senha: 3344Codfy.

UPDATE public.admin_users 
SET 
  password_hash = crypt('3344Codfy.', gen_salt('bf', 6)),
  updated_at = NOW()
WHERE email = 'amadoruben203@gmail.com';