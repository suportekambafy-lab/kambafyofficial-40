-- Atualizar a função RPC para aceitar status 'suspenso'
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal_request(
  request_id UUID,
  new_status TEXT,
  admin_id UUID DEFAULT NULL,
  notes_text TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_amount NUMERIC;
  v_current_status TEXT;
BEGIN
  -- Buscar informações do saque
  SELECT user_id, amount, status INTO v_user_id, v_amount, v_current_status
  FROM withdrawal_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  -- Validar status
  IF new_status NOT IN ('aprovado', 'rejeitado', 'suspenso') THEN
    RAISE EXCEPTION 'Invalid status. Must be aprovado, rejeitado, or suspenso';
  END IF;
  
  -- Atualizar o status do saque
  UPDATE withdrawal_requests
  SET 
    status = new_status,
    admin_notes = notes_text,
    admin_processed_by = admin_id,
    updated_at = NOW()
  WHERE id = request_id;
  
  -- Se REJEITADO e estava pendente ou suspenso, devolver o saldo ao vendedor
  IF new_status = 'rejeitado' AND v_current_status IN ('pendente', 'suspenso') THEN
    -- Criar transação de devolução
    INSERT INTO balance_transactions (
      user_id,
      amount,
      type,
      description,
      currency
    ) VALUES (
      v_user_id,
      v_amount, -- Valor positivo para devolver
      'withdrawal_refund',
      'Devolução de saque rejeitado #' || request_id::TEXT,
      'KZ'
    );
  END IF;
  
  -- Se SUSPENSO: não devolver saldo, apenas marcar como suspenso
  -- O valor permanece "travado" até decisão final
  
  -- Se APROVADO: o saldo já foi deduzido quando o saque foi criado
  -- Não precisa fazer nada adicional
  
END;
$$;