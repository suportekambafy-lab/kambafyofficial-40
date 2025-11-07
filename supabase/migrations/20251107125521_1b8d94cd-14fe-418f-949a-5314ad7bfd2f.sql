
-- Função para corrigir transações duplicadas e saldo
CREATE OR REPLACE FUNCTION admin_fix_duplicate_balance_transaction(
  p_user_id UUID,
  p_transaction_id UUID,
  p_correct_balance NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email TEXT;
  v_deleted_transaction RECORD;
BEGIN
  -- Verificar se é admin
  v_admin_email := get_current_user_email();
  
  IF NOT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = v_admin_email AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar esta ação';
  END IF;

  -- Buscar dados da transação a ser removida
  SELECT * INTO v_deleted_transaction
  FROM balance_transactions
  WHERE id = p_transaction_id;

  -- Remover transação duplicada
  DELETE FROM balance_transactions 
  WHERE id = p_transaction_id;

  -- Atualizar saldo correto
  UPDATE customer_balances 
  SET balance = p_correct_balance,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Registrar ação
  INSERT INTO admin_action_logs (
    admin_email,
    action,
    target_type,
    target_id,
    details,
    jwt_used
  ) VALUES (
    v_admin_email,
    'fix_duplicate_transaction',
    'balance_transaction',
    p_transaction_id,
    jsonb_build_object(
      'user_id', p_user_id,
      'removed_transaction', row_to_json(v_deleted_transaction),
      'new_balance', p_correct_balance
    ),
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'removed_transaction_id', p_transaction_id,
    'new_balance', p_correct_balance
  );
END;
$$;
