-- Corrigir função para evitar erro de arredondamento duplo
CREATE OR REPLACE FUNCTION validate_withdrawal_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_total_balance NUMERIC;
  v_retention_percentage NUMERIC;
  v_retention_release_date TIMESTAMP WITH TIME ZONE;
  v_available_balance NUMERIC;
  v_retained_amount NUMERIC;
  v_withdrawal_amount NUMERIC;
BEGIN
  -- Arredondar o valor da solicitação para 2 casas decimais
  v_withdrawal_amount := ROUND(NEW.amount::NUMERIC, 2);
  
  -- Buscar saldo total do usuário (sem arredondar ainda)
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
  
  -- Calcular saldo disponível (arredondar APENAS o resultado final, não valores intermediários)
  -- Isso evita perda de precisão por arredondamento duplo
  v_available_balance := ROUND(v_total_balance * (100 - v_retention_percentage) / 100, 2);
  v_retained_amount := ROUND(v_total_balance - v_available_balance, 2);
  
  -- Se há retenção ativa (porcentagem > 0 e ainda não liberada)
  IF v_retention_percentage > 0 THEN
    -- Verificar se a data de liberação já passou
    IF v_retention_release_date IS NULL OR v_retention_release_date > NOW() THEN
      -- Retenção ainda ativa - validar contra saldo disponível
      IF v_withdrawal_amount > v_available_balance THEN
        RAISE EXCEPTION 'Valor do saque (%) excede o saldo disponível (%). Você tem % retido até %.',
          v_withdrawal_amount,
          v_available_balance,
          v_retained_amount,
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
  
  -- Atualizar o valor com o arredondado
  NEW.amount := v_withdrawal_amount;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;