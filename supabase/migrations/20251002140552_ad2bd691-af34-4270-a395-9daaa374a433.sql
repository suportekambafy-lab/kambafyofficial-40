-- Criar conta de autenticação para o email de validação
-- Esta é uma conta especial que permite à equipe Kambafy validar conteúdos

-- Inserir usuário diretamente na tabela auth.users
-- NOTA: Em produção, você deve usar o Admin Panel do Supabase para criar esta conta
-- Esta migration serve apenas para configurar a estrutura necessária

-- Como não podemos inserir diretamente em auth.users via migration,
-- vamos garantir que o perfil seja criado quando o admin fizer login pela primeira vez
-- O admin precisará ser criado manualmente no Supabase Auth Dashboard

-- Criar ou atualizar o perfil para validar@kambafy.com quando ele existir
INSERT INTO public.profiles (user_id, full_name, email)
SELECT 
  id,
  'Validação Kambafy',
  'validar@kambafy.com'
FROM auth.users
WHERE email = 'validar@kambafy.com'
ON CONFLICT (user_id) DO UPDATE SET
  full_name = 'Validação Kambafy',
  email = 'validar@kambafy.com',
  updated_at = now();