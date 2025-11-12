-- Remover validação de saldo da aprovação admin - a validação deve ser na criação do pedido
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
DECLARE
  v_request RECORD;
BEGIN
  -- Buscar dados da solicitação
  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de saque não encontrada';
  END IF;
  
  -- Se for aprovação, criar transação de débito
  IF new_status = 'aprovado' THEN
    -- Criar transação de débito na balance_transactions
    INSERT INTO balance_transactions (
      user_id,
      amount,
      type,
      description,
      withdrawal_request_id,
      created_at
    ) VALUES (
      v_request.user_id,
      -v_request.amount,  -- Valor negativo para débito
      'withdrawal',
      'Saque aprovado - ' || COALESCE(notes_text, 'Sem observações'),
      request_id,
      now()
    );
  END IF;
  
  -- Atualizar status da solicitação
  UPDATE withdrawal_requests 
  SET 
    status = new_status,
    admin_processed_by = admin_id,
    admin_notes = notes_text,
    updated_at = now()
  WHERE id = request_id;
END;
$$;