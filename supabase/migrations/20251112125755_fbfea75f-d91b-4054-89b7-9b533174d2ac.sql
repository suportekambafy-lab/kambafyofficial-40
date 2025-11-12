-- Remover desconto na aprovação - o valor já foi reservado na criação do saque
CREATE OR REPLACE FUNCTION admin_process_withdrawal_request(
  request_id uuid, 
  new_status text, 
  admin_id uuid DEFAULT NULL::uuid, 
  notes_text text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se a solicitação existe
  IF NOT EXISTS (SELECT 1 FROM withdrawal_requests WHERE id = request_id) THEN
    RAISE EXCEPTION 'Solicitação de saque não encontrada';
  END IF;
  
  -- Apenas atualizar o status da solicitação
  -- O desconto do saldo já foi feito quando o saque foi criado
  UPDATE withdrawal_requests 
  SET 
    status = new_status,
    admin_processed_by = admin_id,
    admin_notes = notes_text,
    updated_at = now()
  WHERE id = request_id;
END;
$$;