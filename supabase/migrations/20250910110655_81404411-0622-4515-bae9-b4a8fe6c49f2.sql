-- Remover trigger e função existentes
DROP TRIGGER IF EXISTS prevent_signup_email_confirmation_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.prevent_signup_email_confirmation();

-- Criar nova função para prevenir confirmação automática
CREATE OR REPLACE FUNCTION public.prevent_auto_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o usuário foi criado via signup normal (não OAuth), marcar como não confirmado
  IF NEW.email_confirmed_at IS NOT NULL AND NEW.confirmation_sent_at IS NOT NULL THEN
    -- Só manter confirmação se foi feita manualmente ou via OAuth
    IF OLD IS NULL AND NEW.raw_app_meta_data->>'provider' = 'email' THEN
      NEW.email_confirmed_at := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger que será executado ANTES de inserir ou atualizar usuários
CREATE TRIGGER prevent_auto_email_confirmation_trigger
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_auto_email_confirmation();