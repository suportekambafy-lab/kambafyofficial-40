-- Criar transações para vendas 6HOYCTLOE e QSASCA6NJ
-- Agora sem o índice restritivo

DO $$
DECLARE
  seller_user_id UUID := '2fd7e1c6-7f49-4084-a772-99b30b6e74c3';
BEGIN
  -- Venda 6HOYCTLOE
  INSERT INTO balance_transactions (user_id, type, amount, currency, description, order_id, created_at)
  VALUES
    (seller_user_id, 'platform_fee', -449.50, 'KZ', 
     'Taxa da plataforma (8.99%)', '6HOYCTLOE', '2025-11-01 01:32:16+00'),
    (seller_user_id, 'sale_revenue', 4550.50, 'KZ', 
     'Receita de venda (valor líquido após taxa de 8.99%)', '6HOYCTLOE', '2025-11-01 01:32:16+00')
  ON CONFLICT (user_id, order_id, type) DO NOTHING;
  
  -- Venda QSASCA6NJ
  INSERT INTO balance_transactions (user_id, type, amount, currency, description, order_id, created_at)
  VALUES
    (seller_user_id, 'platform_fee', -449.50, 'KZ', 
     'Taxa da plataforma (8.99%)', 'QSASCA6NJ', '2025-11-01 08:44:14+00'),
    (seller_user_id, 'sale_revenue', 4550.50, 'KZ', 
     'Receita de venda (valor líquido após taxa de 8.99%)', 'QSASCA6NJ', '2025-11-01 08:44:14+00')
  ON CONFLICT (user_id, order_id, type) DO NOTHING;
  
  -- Recalcular saldo
  UPDATE customer_balances
  SET balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM balance_transactions
    WHERE user_id = seller_user_id
  ),
  updated_at = NOW()
  WHERE user_id = seller_user_id;
  
  RAISE NOTICE '✅ Transações criadas e saldo recalculado';
END;
$$;