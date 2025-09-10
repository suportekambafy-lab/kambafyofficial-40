-- Criar trigger para prevenir confirmação automática de email
CREATE OR REPLACE FUNCTION public.prevent_signup_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Para novos usuários criados via signup (não OAuth), manter email como não confirmado
  IF TG_OP = 'INSERT' AND NEW.confirmation_sent_at IS NOT NULL THEN
    -- Se foi um signup via email/password, remover confirmação automática
    IF NEW.app_metadata->>'provider' = 'email' THEN
      NEW.email_confirmed_at := NULL;
      NEW.confirmation_sent_at := NULL;
      NEW.confirmation_token := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger que será executado ANTES de inserir ou atualizar usuários
DROP TRIGGER IF EXISTS prevent_signup_email_confirmation_trigger ON auth.users;
CREATE TRIGGER prevent_signup_email_confirmation_trigger
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_signup_email_confirmation();