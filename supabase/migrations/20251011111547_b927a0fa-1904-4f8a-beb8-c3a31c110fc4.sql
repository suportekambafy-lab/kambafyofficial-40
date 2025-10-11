-- Recalcular balances dos usuários afetados pela limpeza
-- Isso garante que customer_balances.balance reflita o estado correto
-- após deletarmos as transações sale_revenue incorretas

DO $$
DECLARE
  affected_user_id UUID;
BEGIN
  -- Para cada usuário com vendas completadas nos últimos 3 dias
  FOR affected_user_id IN 
    SELECT DISTINCT o.user_id
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE o.status = 'completed'
      AND o.created_at > NOW() - INTERVAL '3 days'
      AND p.user_id IS NOT NULL
  LOOP
    -- Recalcular balance usando a função existente
    PERFORM recalculate_user_balance(affected_user_id);
    RAISE NOTICE 'Recalculado balance para usuário %', affected_user_id;
  END LOOP;
END $$;