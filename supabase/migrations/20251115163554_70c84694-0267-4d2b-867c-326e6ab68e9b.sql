
-- Adicionar coluna para armazenar valor retido fixo
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS retained_fixed_amount NUMERIC DEFAULT 0;

-- Atualizar função para definir retenção com valor fixo
CREATE OR REPLACE FUNCTION admin_set_seller_retention(
  p_user_id UUID,
  p_retention_percentage NUMERIC,
  p_reason TEXT,
  p_admin_email TEXT,
  p_retention_days INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_old_percentage NUMERIC;
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
  IF p_retention_days IS NOT NULL THEN
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

  -- Registrar no histórico
  INSERT INTO seller_retention_history (
    user_id,
    admin_email,
    old_percentage,
    new_percentage,
    reason,
    created_at
  ) VALUES (
    p_user_id,
    p_admin_email,
    COALESCE(v_old_percentage, 0),
    p_retention_percentage,
    p_reason,
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

-- Atualizar função de validação de saque para usar valor fixo
CREATE OR REPLACE FUNCTION validate_withdrawal_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_total_balance NUMERIC;
  v_retained_fixed_amount NUMERIC;
  v_retention_release_date TIMESTAMP WITH TIME ZONE;
  v_available_balance NUMERIC;
  v_withdrawal_amount NUMERIC;
BEGIN
  v_withdrawal_amount := ROUND(NEW.amount::NUMERIC, 2);
  
  -- Buscar saldo total
  SELECT balance INTO v_total_balance
  FROM customer_balances
  WHERE user_id = NEW.user_id;
  
  IF v_total_balance IS NULL OR v_total_balance <= 0 THEN
    RAISE EXCEPTION 'Saldo insuficiente para saque';
  END IF;
  
  -- Buscar valor retido FIXO e data de liberação
  SELECT 
    COALESCE(retained_fixed_amount, 0),
    retention_release_date
  INTO 
    v_retained_fixed_amount,
    v_retention_release_date
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Calcular saldo disponível usando valor retido FIXO
  IF v_retained_fixed_amount > 0 THEN
    -- Verificar se a data de liberação já passou
    IF v_retention_release_date IS NULL OR v_retention_release_date > NOW() THEN
      -- Retenção ainda ativa - disponível = total - retido fixo
      v_available_balance := ROUND(v_total_balance - v_retained_fixed_amount, 2);
      
      IF v_withdrawal_amount > v_available_balance THEN
        RAISE EXCEPTION 'Valor do saque (%) excede o saldo disponível (%). Você tem % retido até %.',
          v_withdrawal_amount,
          v_available_balance,
          v_retained_fixed_amount,
          COALESCE(TO_CHAR(v_retention_release_date, 'DD/MM/YYYY'), 'tempo indeterminado');
      END IF;
    ELSE
      -- Data de liberação passou - validar contra saldo total
      IF v_withdrawal_amount > ROUND(v_total_balance, 2) THEN
        RAISE EXCEPTION 'Valor do saque (%) excede o saldo total (%).', 
          v_withdrawal_amount, 
          ROUND(v_total_balance, 2);
      END IF;
    END IF;
  ELSE
    -- Sem retenção - validar contra saldo total
    IF v_withdrawal_amount > ROUND(v_total_balance, 2) THEN
      RAISE EXCEPTION 'Valor do saque (%) excede o saldo total (%).', 
        v_withdrawal_amount, 
        ROUND(v_total_balance, 2);
    END IF;
  END IF;
  
  NEW.amount := v_withdrawal_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atualizar função get_available_balance_with_retention para usar valor fixo
CREATE OR REPLACE FUNCTION get_available_balance_with_retention(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_balance NUMERIC;
  v_retained_fixed_amount NUMERIC;
  v_retention_release_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar saldo total
  SELECT COALESCE(balance, 0) INTO v_total_balance
  FROM customer_balances
  WHERE user_id = p_user_id;

  -- Buscar valor retido FIXO
  SELECT 
    COALESCE(retained_fixed_amount, 0),
    retention_release_date
  INTO 
    v_retained_fixed_amount,
    v_retention_release_date
  FROM profiles
  WHERE user_id = p_user_id;

  -- Se há retenção ativa
  IF v_retained_fixed_amount > 0 AND (v_retention_release_date IS NULL OR v_retention_release_date > NOW()) THEN
    -- Disponível = total - retido fixo
    RETURN ROUND(v_total_balance - v_retained_fixed_amount, 2);
  ELSE
    -- Sem retenção ativa - retornar saldo total
    RETURN ROUND(v_total_balance, 2);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
