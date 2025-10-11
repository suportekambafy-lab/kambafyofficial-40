-- ============================================
-- FUNÇÃO ADMIN: RECALCULAR SALDO DE VENDEDOR
-- ============================================
-- Esta função recalcula o saldo correto baseado em TODAS as transações
-- Remove transações duplicadas antigas e garante consistência

CREATE OR REPLACE FUNCTION admin_recalculate_seller_balance(
  target_user_id UUID,
  delete_old_credit_transactions BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_balance NUMERIC;
  new_balance NUMERIC;
  deleted_count INTEGER := 0;
  transaction_count INTEGER;
BEGIN
  -- Buscar saldo atual
  SELECT balance INTO old_balance
  FROM customer_balances
  WHERE user_id = target_user_id;
  
  -- Se delete_old_credit_transactions = true, remover transações antigas de "credit"
  IF delete_old_credit_transactions THEN
    -- Deletar apenas transações de "credit" que não são de afiliados ou específicas
    DELETE FROM balance_transactions
    WHERE user_id = target_user_id
      AND type = 'credit'
      AND description LIKE '%Venda do produto%';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
  END IF;
  
  -- Calcular saldo correto baseado em TODAS as transações
  SELECT COALESCE(SUM(amount), 0) INTO new_balance
  FROM balance_transactions
  WHERE user_id = target_user_id;
  
  -- Contar transações
  SELECT COUNT(*) INTO transaction_count
  FROM balance_transactions
  WHERE user_id = target_user_id;
  
  -- Atualizar saldo para o valor correto
  UPDATE customer_balances
  SET 
    balance = new_balance,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Se não existe, criar
  IF NOT FOUND THEN
    INSERT INTO customer_balances (user_id, balance, currency)
    VALUES (target_user_id, new_balance, 'KZ');
  END IF;
  
  -- Retornar resultado detalhado
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'old_balance', old_balance,
    'new_balance', new_balance,
    'difference', new_balance - COALESCE(old_balance, 0),
    'deleted_transactions', deleted_count,
    'total_transactions', transaction_count
  );
END;
$$;

-- ============================================
-- FUNÇÃO ADMIN: RECALCULAR TODOS OS SALDOS
-- ============================================
CREATE OR REPLACE FUNCTION admin_recalculate_all_seller_balances()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_record RECORD;
  result_array JSONB := '[]'::JSONB;
  total_sellers INTEGER := 0;
  total_fixed INTEGER := 0;
BEGIN
  -- Iterar sobre todos os vendedores que têm transações
  FOR seller_record IN 
    SELECT DISTINCT user_id 
    FROM balance_transactions 
    WHERE user_id IS NOT NULL
  LOOP
    total_sellers := total_sellers + 1;
    
    -- Recalcular saldo de cada vendedor
    result_array := result_array || admin_recalculate_seller_balance(seller_record.user_id, true);
    total_fixed := total_fixed + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_sellers_processed', total_sellers,
    'total_fixed', total_fixed,
    'details', result_array,
    'timestamp', NOW()
  );
END;
$$;