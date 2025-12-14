
-- =====================================================
-- CORREÇÃO CRÍTICA: Duplicações de balance_transactions
-- =====================================================

-- 1. Adicionar constraint UNIQUE para impedir duplicações futuras
-- Usamos um índice único parcial para permitir NULL em order_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_balance_transactions_no_duplicates 
ON public.balance_transactions (user_id, order_id, type) 
WHERE order_id IS NOT NULL;

-- 2. Função para identificar e remover transações duplicadas
-- Mantém apenas a primeira transação (mais antiga) de cada combinação user_id + amount + date
DO $$
DECLARE
  deleted_count INTEGER := 0;
  affected_user RECORD;
BEGIN
  -- Identificar transações duplicadas (mesma data, mesmo valor, mesmo user)
  FOR affected_user IN 
    SELECT 
      bt.user_id,
      DATE(bt.created_at) as tx_date,
      bt.amount,
      bt.type,
      array_agg(bt.id ORDER BY bt.created_at ASC) as tx_ids,
      COUNT(*) as tx_count
    FROM balance_transactions bt
    WHERE bt.type = 'sale_revenue'
    GROUP BY bt.user_id, DATE(bt.created_at), bt.amount, bt.type
    HAVING COUNT(*) > 1
  LOOP
    -- Deletar todas exceto a primeira (mais antiga)
    DELETE FROM balance_transactions 
    WHERE id = ANY(affected_user.tx_ids[2:]);
    
    deleted_count := deleted_count + (array_length(affected_user.tx_ids, 1) - 1);
    
    RAISE NOTICE 'Removidas % transações duplicadas para user_id: %', 
      array_length(affected_user.tx_ids, 1) - 1, affected_user.user_id;
  END LOOP;
  
  RAISE NOTICE 'Total de transações duplicadas removidas: %', deleted_count;
END $$;

-- 3. Recalcular todos os saldos baseado nas transações restantes
UPDATE customer_balances cb
SET 
  balance = COALESCE((
    SELECT SUM(CASE WHEN bt.type IN ('credit', 'sale_revenue', 'affiliate_commission', 'order_bump_revenue', 'module_sale_revenue') 
                    THEN bt.amount 
                    ELSE -bt.amount END)
    FROM balance_transactions bt
    WHERE bt.user_id = cb.user_id
  ), 0),
  updated_at = now();

-- 4. Log das correções aplicadas
DO $$
DECLARE
  total_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM customer_balances;
  RAISE NOTICE 'Saldos recalculados para % usuários', total_users;
END $$;
