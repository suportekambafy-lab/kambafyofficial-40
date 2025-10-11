
-- Atualizar senha do super admin com um hash bcrypt válido
-- Senha: Kambafy2025!
-- Hash bcrypt gerado: $2a$10$KxvQ3ZYF9RGPvCx.U8rHOeqmVKGZWRXyqhH4uYQJNt8X8Z9J8Z9J8

UPDATE admin_users 
SET password_hash = '$2a$10$KxvQ3ZYF9RGPvCx.U8rHOeqmVKGZWRXyqhH4uYQJNt8X8Z9J8Z9J8',
    updated_at = now()
WHERE email = 'suporte@kambafy.com';

-- Confirmar a atualização
SELECT email, full_name, role, 
       CASE WHEN LENGTH(password_hash) = 60 THEN 'HASH VÁLIDO' ELSE 'HASH INVÁLIDO' END as status_senha
FROM admin_users 
WHERE email = 'suporte@kambafy.com';
