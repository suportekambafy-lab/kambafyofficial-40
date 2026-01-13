-- Adicionar campo de IP de registro nos perfis
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS registration_ip text,
ADD COLUMN IF NOT EXISTS last_login_ip text,
ADD COLUMN IF NOT EXISTS registration_fingerprint text;

-- Adicionar índice para busca rápida por IP
CREATE INDEX IF NOT EXISTS idx_profiles_registration_ip ON public.profiles(registration_ip);

-- Adicionar campos de validação anti-fraude na tabela de indicações
ALTER TABLE public.seller_referrals
ADD COLUMN IF NOT EXISTS ip_match_detected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fraud_flags jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_valid boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS validation_notes text;

-- Função para validar indicação (detectar fraude por IP)
CREATE OR REPLACE FUNCTION validate_referral_fraud()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_ip text;
  referred_ip text;
  referrer_email text;
  referred_email text;
  ip_matches boolean := false;
  same_email_domain boolean := false;
  fraud_reasons jsonb := '[]'::jsonb;
BEGIN
  -- Buscar IPs e emails
  SELECT registration_ip, email INTO referrer_ip, referrer_email
  FROM profiles WHERE id = NEW.referrer_id;
  
  SELECT registration_ip, email INTO referred_ip, referred_email
  FROM profiles WHERE id = NEW.referred_id;
  
  -- Verificar correspondência de IP
  IF referrer_ip IS NOT NULL AND referred_ip IS NOT NULL AND referrer_ip = referred_ip THEN
    ip_matches := true;
    fraud_reasons := fraud_reasons || '["same_registration_ip"]'::jsonb;
  END IF;
  
  -- Verificar se há outros usuários do mesmo referrer com o mesmo IP
  IF EXISTS (
    SELECT 1 FROM seller_referrals sr
    JOIN profiles p ON p.id = sr.referred_id
    WHERE sr.referrer_id = NEW.referrer_id
    AND sr.id != NEW.id
    AND p.registration_ip = referred_ip
    AND referred_ip IS NOT NULL
  ) THEN
    fraud_reasons := fraud_reasons || '["multiple_referrals_same_ip"]'::jsonb;
  END IF;
  
  -- Verificar domínio de email similar (possível auto-indicação)
  IF referrer_email IS NOT NULL AND referred_email IS NOT NULL THEN
    IF split_part(referrer_email, '@', 2) = split_part(referred_email, '@', 2) 
       AND split_part(referrer_email, '@', 2) NOT IN ('gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com') THEN
      same_email_domain := true;
      fraud_reasons := fraud_reasons || '["same_email_domain"]'::jsonb;
    END IF;
  END IF;
  
  -- Atualizar campos de fraude
  NEW.ip_match_detected := ip_matches;
  NEW.fraud_flags := fraud_reasons;
  
  -- Se IP corresponder, marcar como inválido (pendente de revisão)
  IF ip_matches THEN
    NEW.is_valid := false;
    NEW.status := 'fraud_review';
    NEW.validation_notes := 'Indicação bloqueada: IP de registro idêntico ao do indicador';
  END IF;
  
  -- Atualizar fraud_check com detalhes
  NEW.fraud_check := jsonb_build_object(
    'referrer_ip', referrer_ip,
    'referred_ip', referred_ip,
    'ip_match', ip_matches,
    'email_domain_match', same_email_domain,
    'flags', fraud_reasons,
    'checked_at', now()
  );
  
  RETURN NEW;
END;
$$;

-- Trigger para validar fraude em novas indicações
DROP TRIGGER IF EXISTS validate_referral_fraud_trigger ON seller_referrals;
CREATE TRIGGER validate_referral_fraud_trigger
  BEFORE INSERT ON seller_referrals
  FOR EACH ROW
  EXECUTE FUNCTION validate_referral_fraud();

-- Trigger para revalidar quando perfil é atualizado com IP
CREATE OR REPLACE FUNCTION revalidate_referrals_on_ip_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o IP foi adicionado/alterado, verificar indicações pendentes
  IF NEW.registration_ip IS DISTINCT FROM OLD.registration_ip AND NEW.registration_ip IS NOT NULL THEN
    -- Verificar se este usuário foi indicado
    UPDATE seller_referrals sr
    SET 
      fraud_check = jsonb_set(
        COALESCE(fraud_check, '{}'::jsonb),
        '{referred_ip}',
        to_jsonb(NEW.registration_ip)
      )
    WHERE sr.referred_id = NEW.id;
    
    -- Verificar se há correspondência de IP com o referrer
    UPDATE seller_referrals sr
    SET 
      ip_match_detected = true,
      is_valid = false,
      status = 'fraud_review',
      fraud_flags = COALESCE(fraud_flags, '[]'::jsonb) || '["ip_match_on_update"]'::jsonb,
      validation_notes = 'IP detectado correspondente ao indicador após registro'
    FROM profiles p
    WHERE sr.referred_id = NEW.id
    AND sr.referrer_id = p.id
    AND p.registration_ip = NEW.registration_ip;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS revalidate_referrals_trigger ON profiles;
CREATE TRIGGER revalidate_referrals_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION revalidate_referrals_on_ip_update();