-- Resetar senha do super admin para "Kambafy2025!"
-- IMPORTANTE: Esta será a nova senha funcional

-- Atualizar password_hash do admin_users
UPDATE admin_users 
SET password_hash = crypt('Kambafy2025!', gen_salt('bf'))
WHERE email = 'suporte@kambafy.com';

-- Atualizar também no auth.users para manter sincronizado
UPDATE auth.users
SET encrypted_password = crypt('Kambafy2025!', gen_salt('bf'))
WHERE email = 'suporte@kambafy.com';

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Senha do super admin atualizada';
  RAISE NOTICE '📧 Email: suporte@kambafy.com';
  RAISE NOTICE '🔑 Nova senha: Kambafy2025!';
  RAISE NOTICE '⚠️ Altere imediatamente após o primeiro login!';
END $$;