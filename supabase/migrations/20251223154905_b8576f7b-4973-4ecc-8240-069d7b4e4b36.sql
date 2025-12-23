-- Atualizar email para lowercase para consistência
UPDATE admin_users 
SET email = LOWER(email)
WHERE email = 'Paquissimiriam03@gmail.com';

-- Atualizar no auth.users também se existir
UPDATE auth.users 
SET email = LOWER(email)
WHERE email = 'Paquissimiriam03@gmail.com';