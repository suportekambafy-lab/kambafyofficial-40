-- Primeiro remover o trigger existente
DROP TRIGGER IF EXISTS prevent_auto_email_confirmation_trigger ON auth.users;

-- Remover a função existente também 
DROP FUNCTION IF EXISTS public.prevent_auto_email_confirmation();

-- Criar nova função mais robusta
CREATE OR REPLACE FUNCTION public.prevent_auto_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevenir confirmação automática apenas para novos signups via email
  -- Verificar se é um INSERT (novo usuário) e se é via email provider
  IF TG_OP = 'INSERT' AND NEW.raw_app_meta_data->>'provider' = 'email' THEN
    -- Forçar email como não confirmado
    NEW.email_confirmed_at := NULL;
    NEW.confirmation_sent_at := NULL;
    NEW.confirmation_token := NULL;
  END IF;
  
  -- Para UPDATEs, verificar se está tentando confirmar automaticamente
  IF TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Se o provider é email e não foi confirmação manual via código, bloquear
    IF NEW.raw_app_meta_data->>'provider' = 'email' AND NEW.confirmation_token IS NOT NULL THEN
      NEW.email_confirmed_at := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger novamente
CREATE TRIGGER prevent_auto_email_confirmation_trigger
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_auto_email_confirmation();