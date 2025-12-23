-- Remover permissões do admin validar@kambafy.com
DELETE FROM admin_permissions 
WHERE admin_id = (SELECT id FROM admin_users WHERE email = 'validar@kambafy.com');

-- Remover o admin
DELETE FROM admin_users WHERE email = 'validar@kambafy.com';

-- Remover usuário do auth.users se existir
DELETE FROM auth.users WHERE email = 'validar@kambafy.com';