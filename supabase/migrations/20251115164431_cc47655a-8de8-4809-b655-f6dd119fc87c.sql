
-- Remover TODAS as versões antigas da função
DROP FUNCTION IF EXISTS admin_set_seller_retention(uuid, numeric, text, text, integer);
DROP FUNCTION IF EXISTS admin_set_seller_retention(uuid, integer, text, text, integer);
DROP FUNCTION IF EXISTS admin_set_seller_retention(uuid, integer, text, text);

-- Criar a versão correta e definitiva
CREATE OR REPLACE FUNCTION admin_set_seller_retention(
  p_user_id UUID,
  p_retention_percentage INTEGER,
  p_reason TEXT,
  p_admin_email TEXT,
  p_retention_days INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_old_percentage INTEGER;
  v_current_balance NUMERIC;
  v_fixed_retained_amount NUMERIC;
  v_release_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar porcentagem antiga
  SELECT balance_retention_percentage INTO v_old_percentage
  FROM profiles
  WHERE user_id = p_user_id;

  -- Buscar saldo atual
  SELECT COALESCE(balance, 0) INTO v_current_balance
  FROM customer_balances
  WHERE user_id = p_user_id;

  -- Calcular valor retido FIXO baseado no saldo ATUAL
  v_fixed_retained_amount := ROUND(v_current_balance * p_retention_percentage / 100, 2);

  -- Calcular data de liberação se dias foram fornecidos
  IF p_retention_days IS NOT NULL AND p_retention_days > 0 THEN
    v_release_date := NOW() + (p_retention_days || ' days')::INTERVAL;
  ELSE
    v_release_date := NULL;
  END IF;

  -- Atualizar perfil com valor retido FIXO
  UPDATE profiles
  SET 
    balance_retention_percentage = p_retention_percentage,
    retained_fixed_amount = v_fixed_retained_amount,
    retention_reason = p_reason,
    retention_release_date = v_release_date,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Registrar no histórico com retention_days
  INSERT INTO seller_retention_history (
    user_id,
    admin_email,
    old_percentage,
    new_percentage,
    reason,
    retention_days,
    created_at
  ) VALUES (
    p_user_id,
    p_admin_email,
    COALESCE(v_old_percentage, 0),
    p_retention_percentage,
    p_reason,
    p_retention_days,
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'old_percentage', COALESCE(v_old_percentage, 0),
    'new_percentage', p_retention_percentage,
    'fixed_retained_amount', v_fixed_retained_amount,
    'release_date', v_release_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
