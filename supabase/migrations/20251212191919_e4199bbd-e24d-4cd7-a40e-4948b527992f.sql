-- 1. Corrigir o saldo negativo do usuário específico
UPDATE customer_balances 
SET balance = 0, updated_at = NOW()
WHERE user_id = '749c9104-1f43-4b4d-82d8-8d56ec4cb0a3';

-- 2. Criar função para validar que o saldo nunca fique negativo
CREATE OR REPLACE FUNCTION public.prevent_negative_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Impedir saldo negativo
  IF NEW.balance < 0 THEN
    RAISE EXCEPTION 'Saldo não pode ser negativo. Tentativa de definir saldo para: %', NEW.balance;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Criar trigger para prevenir saldos negativos em customer_balances
DROP TRIGGER IF EXISTS check_negative_balance ON customer_balances;
CREATE TRIGGER check_negative_balance
  BEFORE INSERT OR UPDATE ON customer_balances
  FOR EACH ROW
  EXECUTE FUNCTION prevent_negative_balance();

-- 4. Criar função melhorada para validar transações de débito
CREATE OR REPLACE FUNCTION public.validate_debit_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_balance NUMERIC;
  final_balance NUMERIC;
BEGIN
  -- Só validar transações de débito (amount negativo)
  IF NEW.amount < 0 THEN
    -- Buscar saldo atual
    SELECT COALESCE(balance, 0) INTO current_balance
    FROM customer_balances
    WHERE user_id = NEW.user_id;
    
    -- Calcular saldo final
    final_balance := current_balance + NEW.amount;
    
    -- Impedir se resultar em saldo negativo
    IF final_balance < 0 THEN
      RAISE EXCEPTION 'Saldo insuficiente. Saldo atual: %, Débito: %, Saldo resultante: %', 
        current_balance, ABS(NEW.amount), final_balance;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Criar trigger para validar débitos antes de inserir transações
DROP TRIGGER IF EXISTS validate_debit_before_insert ON balance_transactions;
CREATE TRIGGER validate_debit_before_insert
  BEFORE INSERT ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_debit_transaction();

-- 6. Corrigir todos os saldos negativos existentes
UPDATE customer_balances 
SET balance = 0, updated_at = NOW()
WHERE balance < 0;

-- 7. Criar função para recalcular e validar saldo
CREATE OR REPLACE FUNCTION public.safe_recalculate_balance(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  calculated_balance NUMERIC;
  old_balance NUMERIC;
BEGIN
  -- Buscar saldo antigo
  SELECT balance INTO old_balance
  FROM customer_balances
  WHERE user_id = target_user_id;
  
  -- Calcular saldo correto baseado em transações
  SELECT COALESCE(SUM(amount), 0) INTO calculated_balance
  FROM balance_transactions
  WHERE user_id = target_user_id;
  
  -- Garantir que não seja negativo
  IF calculated_balance < 0 THEN
    calculated_balance := 0;
  END IF;
  
  -- Atualizar ou criar registro
  INSERT INTO customer_balances (user_id, balance, currency)
  VALUES (target_user_id, calculated_balance, 'KZ')
  ON CONFLICT (user_id) DO UPDATE SET
    balance = calculated_balance,
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'old_balance', COALESCE(old_balance, 0),
    'new_balance', calculated_balance
  );
END;
$$;