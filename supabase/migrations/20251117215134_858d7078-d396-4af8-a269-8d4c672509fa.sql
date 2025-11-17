-- Corrigir venda S756E1H9G que está com valor bruto em vez de líquido

DO $$
DECLARE
  seller_user_id UUID := '2fd7e1c6-7f49-4084-a772-99b30b6e74c3';
  order_id_fix TEXT := 'S756E1H9G';
  fee_amount NUMERIC := 449.50;
  correct_revenue NUMERIC := 4550.50;
  wrong_revenue NUMERIC := 5000.00;
BEGIN
  -- 1. Deletar a transação sale_revenue INCORRETA (5000 KZ bruto)
  DELETE FROM balance_transactions
  WHERE order_id = order_id_fix
    AND user_id = seller_user_id
    AND type = 'sale_revenue'
    AND amount = wrong_revenue;
  
  RAISE NOTICE '❌ Deletada transação incorreta: sale_revenue de % KZ', wrong_revenue;
  
  -- 2. Criar transação platform_fee que estava faltando
  INSERT INTO balance_transactions (user_id, type, amount, currency, description, order_id, created_at)
  VALUES
    (seller_user_id, 'platform_fee', -fee_amount, 'KZ', 
     'Taxa da plataforma (8.99%)', order_id_fix, '2025-11-01 01:28:53+00')
  ON CONFLICT (user_id, order_id, type) DO NOTHING;
  
  RAISE NOTICE '✅ Criada transação: platform_fee de -% KZ', fee_amount;
  
  -- 3. Criar transação sale_revenue CORRETA (valor líquido)
  INSERT INTO balance_transactions (user_id, type, amount, currency, description, order_id, created_at)
  VALUES
    (seller_user_id, 'sale_revenue', correct_revenue, 'KZ', 
     'Receita de venda (valor líquido após taxa de 8.99%)', order_id_fix, '2025-11-01 01:28:53+00')
  ON CONFLICT (user_id, order_id, type) DO NOTHING;
  
  RAISE NOTICE '✅ Criada transação: sale_revenue de % KZ', correct_revenue;
  
  -- 4. Recalcular saldo
  UPDATE customer_balances
  SET balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM balance_transactions
    WHERE user_id = seller_user_id
  ),
  updated_at = NOW()
  WHERE user_id = seller_user_id;
  
  RAISE NOTICE '✅ Saldo recalculado';
  
  -- 5. Mostrar resumo
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'RESUMO FINAL:';
  RAISE NOTICE 'Total receita líquida: % KZ', (SELECT SUM(amount) FROM balance_transactions WHERE user_id = seller_user_id AND type = 'sale_revenue');
  RAISE NOTICE 'Total taxas: % KZ', (SELECT SUM(amount) FROM balance_transactions WHERE user_id = seller_user_id AND type = 'platform_fee');
  RAISE NOTICE 'Total saques: % KZ', (SELECT SUM(amount) FROM balance_transactions WHERE user_id = seller_user_id AND type = 'debit');
  RAISE NOTICE 'Saldo final: % KZ', (SELECT balance FROM customer_balances WHERE user_id = seller_user_id);
  RAISE NOTICE '═══════════════════════════════════════';
END;
$$;