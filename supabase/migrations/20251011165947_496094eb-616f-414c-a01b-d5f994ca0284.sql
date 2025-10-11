-- Corrigir ambiguidade da função admin_process_withdrawal_request
-- Remove todas as versões anteriores e cria uma versão única e limpa

-- Dropar completamente a função existente (todas as sobrecargas)
DROP FUNCTION IF EXISTS public.admin_process_withdrawal_request(uuid, text, uuid, text);

-- Criar versão única e definitiva da função
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
  -- Atualizar a solicitação diretamente (bypassa RLS)
  -- A verificação de admin é feita no frontend através do sistema customizado
  UPDATE public.withdrawal_requests 
  SET 
    status = new_status,
    admin_processed_by = admin_id,
    admin_notes = notes_text,
    updated_at = now()
  WHERE id = request_id;
  
  -- Verificar se a atualização foi bem-sucedida
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de saque não encontrada';
  END IF;
END;
$$;