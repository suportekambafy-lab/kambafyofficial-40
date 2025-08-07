
-- Adicionar coluna email na tabela profiles para facilitar notificação de vendedores
ALTER TABLE public.profiles ADD COLUMN email text;

-- Criar índice para melhor performance nas consultas por email
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Função para sincronizar email do auth.users para profiles quando o perfil é criado/atualizado
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Quando inserir um novo profile, copiar o email do auth.users
  IF TG_OP = 'INSERT' THEN
    NEW.email := (SELECT email FROM auth.users WHERE id = NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para sincronizar email automaticamente
DROP TRIGGER IF EXISTS sync_user_email_trigger ON public.profiles;
CREATE TRIGGER sync_user_email_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_email();

-- Atualizar perfis existentes com os emails dos usuários
UPDATE public.profiles 
SET email = auth_users.email 
FROM auth.users auth_users 
WHERE profiles.user_id = auth_users.id 
AND profiles.email IS NULL;
