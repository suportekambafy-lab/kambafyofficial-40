-- Remover TODAS as versões da função admin_process_withdrawal_request
-- Dropa versão com 5 parâmetros (com p_jwt_token)
DROP FUNCTION IF EXISTS public.admin_process_withdrawal_request(uuid, text, uuid, text, text);

-- Dropa versão com 4 parâmetros
DROP FUNCTION IF EXISTS public.admin_process_withdrawal_request(uuid, text, uuid, text);

-- Criar versão única e definitiva (sem p_jwt_token)
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal_request(
  request_id uuid, 
  new_status text, 
  admin_id uuid DEFAULT NULL, 
  notes_text text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.withdrawal_requests 
  SET 
    status = new_status,
    admin_processed_by = admin_id,
    admin_notes = notes_text,
    updated_at = now()
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de saque não encontrada';
  END IF;
END;
$$;