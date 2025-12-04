-- ============================================
-- PARTE 1: CRIAR FUNÇÕES E TRIGGER DE PREVENÇÃO
-- (Sem o índice único ainda - será criado após limpeza)
-- ============================================

-- 1️⃣ FUNÇÃO DE PREVENÇÃO DE DUPLICATAS
CREATE OR REPLACE FUNCTION prevent_duplicate_sale_transactions()
RETURNS TRIGGER AS $$
BEGIN
  -- Se é uma transação de venda (credit ou sale_revenue com order_id)
  IF NEW.type IN ('credit', 'sale_revenue') AND NEW.order_id IS NOT NULL THEN
    -- Verificar se já existe transação para este order_id e user_id
    IF EXISTS (
      SELECT 1 FROM balance_transactions 
      WHERE order_id = NEW.order_id 
        AND user_id = NEW.user_id
        AND type IN ('credit', 'sale_revenue')
    ) THEN
      -- Log da tentativa bloqueada
      RAISE WARNING '[BALANCE_PROTECTION] Transação duplicada BLOQUEADA: order_id=%, user_id=%, tipo_tentado=%, timestamp=%', 
        NEW.order_id, NEW.user_id, NEW.type, NOW();
      RETURN NULL; -- Cancela a inserção silenciosamente
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2️⃣ TRIGGER DE PREVENÇÃO (ANTES da inserção)
DROP TRIGGER IF EXISTS trg_prevent_duplicate_sales ON balance_transactions;
CREATE TRIGGER trg_prevent_duplicate_sales
BEFORE INSERT ON balance_transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_sale_transactions();

-- 3️⃣ VIEW DE AUDITORIA - Detecta inconsistências automaticamente
DROP VIEW IF EXISTS balance_audit_discrepancies;
CREATE OR REPLACE VIEW balance_audit_discrepancies AS
SELECT 
  bt.user_id,
  p.full_name,
  p.email,
  ROUND(COALESCE(SUM(bt.amount), 0)::numeric, 2) as calculated_balance,
  ROUND(COALESCE(cb.balance, 0)::numeric, 2) as stored_balance,
  ROUND((COALESCE(SUM(bt.amount), 0) - COALESCE(cb.balance, 0))::numeric, 2) as discrepancy,
  COUNT(bt.id) as total_transactions
FROM balance_transactions bt
LEFT JOIN customer_balances cb ON bt.user_id = cb.user_id
LEFT JOIN profiles p ON bt.user_id = p.user_id
WHERE bt.user_id IS NOT NULL
GROUP BY bt.user_id, cb.balance, p.full_name, p.email
HAVING ABS(COALESCE(SUM(bt.amount), 0) - COALESCE(cb.balance, 0)) > 0.01;

-- 4️⃣ FUNÇÃO DE AUTO-CORREÇÃO (sob demanda)
CREATE OR REPLACE FUNCTION auto_fix_balance_discrepancy(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculated NUMERIC;
  stored NUMERIC;
  user_email TEXT;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO calculated
  FROM balance_transactions WHERE user_id = target_user_id;
  
  SELECT balance INTO stored
  FROM customer_balances WHERE user_id = target_user_id;
  
  SELECT email INTO user_email
  FROM profiles WHERE user_id = target_user_id;
  
  IF ABS(calculated - COALESCE(stored, 0)) > 0.01 THEN
    UPDATE customer_balances 
    SET balance = calculated, updated_at = NOW()
    WHERE user_id = target_user_id;
    
    IF NOT FOUND THEN
      INSERT INTO customer_balances (user_id, balance, currency)
      VALUES (target_user_id, calculated, 'KZ');
    END IF;
    
    RETURN jsonb_build_object(
      'fixed', true,
      'user_id', target_user_id,
      'email', user_email,
      'old_balance', ROUND(stored::numeric, 2),
      'new_balance', ROUND(calculated::numeric, 2),
      'discrepancy', ROUND((calculated - COALESCE(stored, 0))::numeric, 2),
      'fixed_at', NOW()
    );
  END IF;
  
  RETURN jsonb_build_object(
    'fixed', false, 
    'user_id', target_user_id,
    'balance', ROUND(COALESCE(stored, 0)::numeric, 2),
    'message', 'Nenhuma discrepância encontrada'
  );
END;
$$;

-- 5️⃣ FUNÇÃO PARA CORRIGIR TODAS AS DISCREPÂNCIAS
CREATE OR REPLACE FUNCTION fix_all_balance_discrepancies()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  discrepancy_record RECORD;
  result JSONB;
  results JSONB := '[]'::JSONB;
  total_fixed INTEGER := 0;
BEGIN
  FOR discrepancy_record IN 
    SELECT user_id FROM balance_audit_discrepancies
  LOOP
    result := auto_fix_balance_discrepancy(discrepancy_record.user_id);
    IF (result->>'fixed')::boolean THEN
      total_fixed := total_fixed + 1;
      results := results || result;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_fixed', total_fixed,
    'details', results,
    'executed_at', NOW()
  );
END;
$$;

-- 6️⃣ FUNÇÃO PARA VERIFICAR SAÚDE DOS SALDOS
CREATE OR REPLACE FUNCTION check_balance_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_users INTEGER;
  users_with_discrepancy INTEGER;
  total_discrepancy NUMERIC;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO total_users
  FROM customer_balances;
  
  SELECT 
    COUNT(*),
    COALESCE(SUM(ABS(discrepancy)), 0)
  INTO users_with_discrepancy, total_discrepancy
  FROM balance_audit_discrepancies;
  
  RETURN jsonb_build_object(
    'healthy', users_with_discrepancy = 0,
    'total_users', total_users,
    'users_with_discrepancy', users_with_discrepancy,
    'total_discrepancy_amount', ROUND(total_discrepancy::numeric, 2),
    'checked_at', NOW()
  );
END;
$$;

-- 7️⃣ FUNÇÃO PARA LIMPAR DUPLICATAS E CRIAR ÍNDICE
CREATE OR REPLACE FUNCTION cleanup_duplicate_transactions_and_create_index()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dup_record RECORD;
  deleted_count INTEGER := 0;
  affected_users JSONB := '[]'::JSONB;
BEGIN
  -- Encontrar e remover duplicatas (mantendo sale_revenue, removendo credit)
  FOR dup_record IN 
    WITH duplicates AS (
      SELECT 
        user_id, 
        order_id,
        array_agg(id ORDER BY 
          CASE type WHEN 'sale_revenue' THEN 1 ELSE 2 END,
          created_at
        ) as ids,
        array_agg(type ORDER BY 
          CASE type WHEN 'sale_revenue' THEN 1 ELSE 2 END,
          created_at
        ) as types
      FROM balance_transactions
      WHERE order_id IS NOT NULL 
        AND type IN ('credit', 'sale_revenue')
      GROUP BY user_id, order_id
      HAVING COUNT(*) > 1
    )
    SELECT 
      user_id,
      order_id,
      ids[2:] as ids_to_delete, -- Manter o primeiro (sale_revenue ou mais antigo)
      types
    FROM duplicates
  LOOP
    -- Deletar IDs duplicados
    DELETE FROM balance_transactions 
    WHERE id = ANY(dup_record.ids_to_delete);
    
    deleted_count := deleted_count + array_length(dup_record.ids_to_delete, 1);
    
    -- Registrar usuário afetado
    affected_users := affected_users || jsonb_build_object(
      'user_id', dup_record.user_id,
      'order_id', dup_record.order_id,
      'deleted_count', array_length(dup_record.ids_to_delete, 1)
    );
    
    -- Recalcular saldo do usuário
    PERFORM recalculate_user_balance(dup_record.user_id);
  END LOOP;
  
  -- Agora criar o índice único
  DROP INDEX IF EXISTS idx_unique_sale_transaction_per_order;
  CREATE UNIQUE INDEX idx_unique_sale_transaction_per_order 
  ON balance_transactions (user_id, order_id) 
  WHERE order_id IS NOT NULL 
    AND type IN ('credit', 'sale_revenue');
  
  RETURN jsonb_build_object(
    'success', true,
    'duplicates_deleted', deleted_count,
    'affected_users', affected_users,
    'index_created', true,
    'executed_at', NOW()
  );
END;
$$;