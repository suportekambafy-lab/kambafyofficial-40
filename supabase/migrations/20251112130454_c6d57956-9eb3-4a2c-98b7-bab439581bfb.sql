-- Criar função para atualizar saldo manualmente (admin)
CREATE OR REPLACE FUNCTION admin_update_balance(
  p_user_id uuid,
  p_new_balance numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualizar saldo
  UPDATE customer_balances
  SET 
    balance = p_new_balance,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Se não existe, criar
  IF NOT FOUND THEN
    INSERT INTO customer_balances (user_id, balance, currency)
    VALUES (p_user_id, p_new_balance, 'KZ');
  END IF;
END;
$$;