-- Desabilitar confirmação automática por email para novos usuários
-- Isso é feito através de um hook/trigger que marca usuários como não-confirmados

CREATE OR REPLACE FUNCTION public.prevent_auto_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o usuário foi criado via signup normal (não OAuth), marcar como não confirmado
  IF NEW.email_confirmed_at IS NOT NULL AND NEW.confirmation_sent_at IS NOT NULL THEN
    -- Só manter confirmação se foi feita manualmente ou via OAuth
    IF OLD IS NULL AND NEW.app_metadata->>'provider' = 'email' THEN
      NEW.email_confirmed_at := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger na tabela auth.users (se permitido)
-- Nota: Este trigger pode não funcionar devido às restrições do Supabase
-- DROP TRIGGER IF EXISTS prevent_auto_confirmation ON auth.users;
-- CREATE TRIGGER prevent_auto_confirmation 
--   BEFORE INSERT ON auth.users 
--   FOR EACH ROW 
--   EXECUTE FUNCTION public.prevent_auto_email_confirmation();