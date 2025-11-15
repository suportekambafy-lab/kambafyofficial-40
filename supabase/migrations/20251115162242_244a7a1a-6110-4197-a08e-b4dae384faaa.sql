-- Função para validar saldo disponível considerando retenção
CREATE OR REPLACE FUNCTION validate_withdrawal_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_total_balance NUMERIC;
  v_retention_percentage NUMERIC;
  v_retention_release_date TIMESTAMP WITH TIME ZONE;
  v_available_balance NUMERIC;
  v_retained_amount NUMERIC;
BEGIN
  -- Buscar saldo total do usuário
  SELECT balance INTO v_total_balance
  FROM customer_balances
  WHERE user_id = NEW.user_id;
  
  -- Se não houver saldo, não permitir saque
  IF v_total_balance IS NULL OR v_total_balance <= 0 THEN
    RAISE EXCEPTION 'Saldo insuficiente para saque';
  END IF;
  
  -- Buscar dados de retenção do perfil
  SELECT 
    COALESCE(balance_retention_percentage, 0),
    retention_release_date
  INTO 
    v_retention_percentage,
    v_retention_release_date
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Calcular valor retido e saldo disponível
  v_retained_amount := (v_total_balance * v_retention_percentage) / 100;
  v_available_balance := v_total_balance - v_retained_amount;
  
  -- Se há retenção ativa (porcentagem > 0 e ainda não liberada)
  IF v_retention_percentage > 0 THEN
    -- Verificar se a data de liberação já passou
    IF v_retention_release_date IS NULL OR v_retention_release_date > NOW() THEN
      -- Retenção ainda ativa - validar contra saldo disponível
      IF NEW.amount > v_available_balance THEN
        RAISE EXCEPTION 'Valor do saque (%) excede o saldo disponível (%). Você tem % retido até %.',
          NEW.amount,
          v_available_balance,
          v_retained_amount,
          COALESCE(TO_CHAR(v_retention_release_date, 'DD/MM/YYYY'), 'tempo indeterminado');
      END IF;
    ELSE
      -- Data de liberação passou - validar contra saldo total
      IF NEW.amount > v_total_balance THEN
        RAISE EXCEPTION 'Valor do saque (%) excede o saldo total (%).', NEW.amount, v_total_balance;
      END IF;
    END IF;
  ELSE
    -- Sem retenção - validar contra saldo total
    IF NEW.amount > v_total_balance THEN
      RAISE EXCEPTION 'Valor do saque (%) excede o saldo total (%).', NEW.amount, v_total_balance;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para validar saque antes de inserir
DROP TRIGGER IF EXISTS validate_withdrawal_before_insert ON withdrawal_requests;

CREATE TRIGGER validate_withdrawal_before_insert
  BEFORE INSERT ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_withdrawal_amount();

-- Comentários
COMMENT ON FUNCTION validate_withdrawal_amount() IS 'Valida se o valor do saque não excede o saldo disponível, considerando retenção ativa';
COMMENT ON TRIGGER validate_withdrawal_before_insert ON withdrawal_requests IS 'Trigger que valida saldo disponível antes de criar solicitação de saque';