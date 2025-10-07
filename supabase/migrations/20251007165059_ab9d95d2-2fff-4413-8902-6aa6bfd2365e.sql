
-- Criar função para recalcular saldos baseado em transações
CREATE OR REPLACE FUNCTION public.recalculate_user_balance(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  correct_balance NUMERIC;
BEGIN
  -- Calcular saldo correto baseado nas transações
  SELECT COALESCE(SUM(amount), 0) INTO correct_balance
  FROM balance_transactions
  WHERE user_id = target_user_id;
  
  -- Atualizar para o saldo correto
  UPDATE customer_balances
  SET 
    balance = correct_balance,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Se não existe, criar
  IF NOT FOUND THEN
    INSERT INTO customer_balances (user_id, balance, currency)
    VALUES (target_user_id, correct_balance, 'KZ');
  END IF;
END;
$$;

-- Executar correção para o Dario
SELECT public.recalculate_user_balance('a906647b-3e73-4ddc-a8ed-c00cdd7b8c31');
