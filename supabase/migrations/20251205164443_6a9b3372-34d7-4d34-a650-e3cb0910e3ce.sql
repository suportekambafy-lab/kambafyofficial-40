-- Update Amado Ruben's email and password
UPDATE public.admin_users 
SET 
  email = 'amadoruben@kambafy.com',
  password_hash = crypt('Kambafy2025@amado', gen_salt('bf')),
  updated_at = now()
WHERE email = 'amadoruben203@gmail.com';