-- Remover Amado Ruben apenas como admin (manter como vendedor)

-- 1. Deletar logs do admin
DELETE FROM public.admin_logs WHERE admin_id = '105b893d-5695-4f94-9996-13825b62fadc';

-- 2. Deletar permissões do admin
DELETE FROM public.admin_permissions WHERE admin_id = '105b893d-5695-4f94-9996-13825b62fadc';

-- 3. Deletar da tabela admin_users (remove privilégios de admin)
DELETE FROM public.admin_users WHERE id = '105b893d-5695-4f94-9996-13825b62fadc';

-- Nota: O usuário continua existindo como vendedor normal no sistema