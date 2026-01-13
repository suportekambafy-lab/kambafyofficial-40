-- Função para aprovar candidatura (bypass RLS)
CREATE OR REPLACE FUNCTION approve_referral_application(
  application_id UUID,
  admin_name TEXT DEFAULT 'Admin'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  result JSON;
BEGIN
  -- Gerar código único
  SELECT generate_referral_code() INTO new_code;
  
  -- Atualizar candidatura
  UPDATE referral_program_applications
  SET 
    status = 'approved',
    referral_code = new_code,
    approved_at = now(),
    approved_by = admin_name,
    updated_at = now()
  WHERE id = application_id;
  
  -- Retornar resultado
  SELECT json_build_object(
    'success', true,
    'referral_code', new_code
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Função para rejeitar candidatura (bypass RLS)
CREATE OR REPLACE FUNCTION reject_referral_application(
  application_id UUID,
  reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE referral_program_applications
  SET 
    status = 'rejected',
    rejection_reason = reason,
    updated_at = now()
  WHERE id = application_id;
  
  RETURN json_build_object('success', true);
END;
$$;