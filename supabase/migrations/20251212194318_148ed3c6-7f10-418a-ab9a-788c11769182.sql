-- 1. Remover trigger que bloqueia saldos negativos em customer_balances
DROP TRIGGER IF EXISTS check_negative_balance ON customer_balances;

-- 2. Remover trigger que valida débitos antes de inserir
DROP TRIGGER IF EXISTS validate_debit_before_insert ON balance_transactions;

-- 3. Remover função prevent_negative_balance
DROP FUNCTION IF EXISTS public.prevent_negative_balance();

-- 4. Remover função validate_debit_transaction
DROP FUNCTION IF EXISTS public.validate_debit_transaction();

-- 5. Atualizar safe_recalculate_balance para permitir saldos negativos
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
  
  -- PERMITIR saldos negativos (reembolsos, correções, etc.)
  -- Não forçar para 0
  
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