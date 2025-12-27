-- Habilitar extensão pgcrypto para gen_random_bytes()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recriar a função approve_partner usando pgcrypto
CREATE OR REPLACE FUNCTION public.approve_partner(partner_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_api_key TEXT;
BEGIN
  -- Gerar API key usando pgcrypto
  new_api_key := encode(gen_random_bytes(32), 'hex');
  
  -- Atualizar o parceiro
  UPDATE partners
  SET 
    status = 'approved',
    approved_at = now(),
    api_key = new_api_key,
    updated_at = now()
  WHERE id = partner_id;
END;
$$;