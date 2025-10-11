-- CORRIGIR SALDO: Remover sale_revenue de vendas com menos de 3 dias
-- e recalcular saldos

DO $$
DECLARE
  order_record RECORD;
  user_record RECORD;
BEGIN
  -- 1. Deletar sale_revenue de vendas com menos de 3 dias
  --    (vendas que ainda estão no período de retenção)
  FOR order_record IN 
    SELECT DISTINCT bt.order_id, bt.user_id, o.created_at
    FROM balance_transactions bt
    JOIN orders o ON bt.order_id = o.order_id
    WHERE bt.type = 'sale_revenue'
      AND o.created_at > NOW() - INTERVAL '3 days'
      AND o.status = 'completed'
  LOOP
    -- Deletar a transação sale_revenue prematura
    DELETE FROM balance_transactions 
    WHERE order_id = order_record.order_id 
      AND type = 'sale_revenue';
    
    RAISE NOTICE 'Removido sale_revenue prematuro: %', order_record.order_id;
  END LOOP;
  
  -- 2. Recalcular saldos de todos os usuários afetados
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM balance_transactions
  LOOP
    -- Calcular saldo correto baseado nas transações
    UPDATE customer_balances cb
    SET balance = (
      SELECT COALESCE(SUM(amount), 0)
      FROM balance_transactions bt
      WHERE bt.user_id = user_record.user_id
    ),
    updated_at = NOW()
    WHERE cb.user_id = user_record.user_id;
    
    RAISE NOTICE 'Saldo recalculado para usuário: %', user_record.user_id;
  END LOOP;
  
  RAISE NOTICE '✅ Correção concluída - sale_revenue será criado após 3 dias pela Edge Function';
END $$;