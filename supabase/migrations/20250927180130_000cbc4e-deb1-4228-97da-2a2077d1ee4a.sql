-- Verificar e remover função que impede confirmação automática de email
DROP FUNCTION IF EXISTS public.prevent_auto_email_confirmation() CASCADE;

-- Remover qualquer trigger relacionado à tabela auth.users
-- (Não podemos modificar diretamente, mas vamos verificar se há triggers customizados)