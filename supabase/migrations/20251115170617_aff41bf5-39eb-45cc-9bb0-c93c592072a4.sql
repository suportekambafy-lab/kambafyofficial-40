
-- Função para configurar retenção de saldo
CREATE OR REPLACE FUNCTION admin_set_seller_retention(
  target_user_id UUID,
  retention_percentage NUMERIC,
  fixed_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
  calculated_retained NUMERIC;
BEGIN
  -- Buscar saldo atual
  SELECT balance INTO current_balance
  FROM customer_balances
  WHERE user_id = target_user_id;
  
  -- Se fixed_amount não foi fornecido, calcular baseado na porcentagem
  IF fixed_amount IS NULL THEN
    calculated_retained := current_balance * (retention_percentage / 100);
  ELSE
    calculated_retained := fixed_amount;
  END IF;
  
  -- Atualizar perfil com retenção
  UPDATE profiles
  SET 
    balance_retention_percentage = retention_percentage,
    retained_fixed_amount = calculated_retained
  WHERE user_id = target_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'total_balance', current_balance,
    'retention_percentage', retention_percentage,
    'retained_fixed', calculated_retained,
    'available_balance', current_balance - calculated_retained
  );
END;
$$;
