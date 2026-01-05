-- Corrigir função para usar a moeda correcta do withdrawal_request
CREATE OR REPLACE FUNCTION public.deduct_withdrawal_from_balance()
RETURNS TRIGGER AS $$
DECLARE
  existing_debit BOOLEAN;
BEGIN
  -- Verificar se JÁ existe um débito para este saque
  SELECT EXISTS (
    SELECT 1 FROM balance_transactions
    WHERE order_id = 'withdrawal_' || NEW.id::text
      AND type = 'debit'
      AND user_id = NEW.user_id
  ) INTO existing_debit;
  
  -- Se não existe, criar
  IF NOT existing_debit THEN
    BEGIN
      INSERT INTO public.balance_transactions (
        user_id,
        type,
        amount,
        currency,
        description,
        order_id
      )
      VALUES (
        NEW.user_id,
        'debit',
        -ABS(NEW.amount), -- Garantir que seja negativo
        COALESCE(NEW.currency, 'KZ'), -- ✅ Usar a moeda do saque
        'Saque solicitado',
        'withdrawal_' || NEW.id::text
      );
      
      RAISE NOTICE '✅ Débito criado: saque % (-% %)', NEW.id, NEW.amount, COALESCE(NEW.currency, 'KZ');
    EXCEPTION 
      WHEN unique_violation THEN
        RAISE NOTICE '⚠️ Débito já existe (constraint): saque %', NEW.id;
    END;
  ELSE
    RAISE NOTICE '⚠️ Débito já existe: saque %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Também corrigir a validação para usar currency_balances com a moeda correcta
CREATE OR REPLACE FUNCTION public.validate_withdrawal_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_total_balance NUMERIC;
  v_retained_fixed_amount NUMERIC;
  v_retention_release_date TIMESTAMP WITH TIME ZONE;
  v_available_balance NUMERIC;
  v_withdrawal_amount NUMERIC;
  v_currency TEXT;
BEGIN
  v_withdrawal_amount := ROUND(NEW.amount::NUMERIC, 2);
  v_currency := COALESCE(NEW.currency, 'KZ');
  
  -- Buscar saldo total NA MOEDA CORRECTA
  SELECT balance INTO v_total_balance
  FROM currency_balances
  WHERE user_id = NEW.user_id AND currency = v_currency;
  
  IF v_total_balance IS NULL OR v_total_balance <= 0 THEN
    RAISE EXCEPTION 'Saldo insuficiente para saque em %', v_currency;
  END IF;
  
  -- Buscar valor retido FIXO e data de liberação (só aplica a KZ por enquanto)
  IF v_currency = 'KZ' THEN
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
  ELSE
    -- Para outras moedas, só validar contra saldo total
    IF v_withdrawal_amount > ROUND(v_total_balance, 2) THEN
      RAISE EXCEPTION 'Valor do saque (% %) excede o saldo total (% %).', 
        v_withdrawal_amount, v_currency,
        ROUND(v_total_balance, 2), v_currency;
    END IF;
  END IF;
  
  NEW.amount := v_withdrawal_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;