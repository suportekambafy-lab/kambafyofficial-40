-- Atualizar função RPC para NÃO verificar/deduzir saldo na aprovação
-- O saldo já foi reservado quando o vendedor fez a solicitação
CREATE OR REPLACE FUNCTION admin_process_withdrawal_request(
  request_id UUID,
  new_status TEXT,
  admin_id UUID DEFAULT NULL,
  notes_text TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_amount NUMERIC;
  v_current_status TEXT;
BEGIN
  -- Buscar dados da solicitação
  SELECT user_id, amount, status 
  INTO v_user_id, v_amount, v_current_status
  FROM withdrawal_requests 
  WHERE id = request_id;
  
  -- Verificar se a solicitação existe
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Solicitação de saque não encontrada';
  END IF;
  
  -- Verificar se já foi processada
  IF v_current_status != 'pendente' THEN
    RAISE EXCEPTION 'Esta solicitação já foi processada (status: %)', v_current_status;
  END IF;
  
  -- ℹ️ NOTA: O saldo já foi reservado/deduzido quando o vendedor fez a solicitação
  -- Aqui apenas atualizamos o status para aprovado ou rejeitado
  
  -- Se REJEITADO, devolver o valor ao saldo do vendedor
  IF new_status = 'rejeitado' THEN
    -- Devolver o valor ao saldo do vendedor
    UPDATE customer_balances 
    SET 
      balance = balance + v_amount,
      updated_at = now()
    WHERE user_id = v_user_id;
    
    -- Registrar transação de estorno
    INSERT INTO balance_transactions (
      user_id,
      amount,
      type,
      description,
      currency
    ) VALUES (
      v_user_id,
      v_amount,
      'withdrawal_refund',
      'Saque rejeitado - Valor devolvido ao saldo - ID: ' || request_id::text,
      'KZ'
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