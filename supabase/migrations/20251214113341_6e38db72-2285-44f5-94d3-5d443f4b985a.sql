
-- =====================================================
-- CORREÇÃO: Recriar transações faltantes para todas orders
-- =====================================================

-- Inserir transações que estão faltando (orders sem balance_transaction correspondente)
INSERT INTO balance_transactions (user_id, type, amount, currency, description, order_id, created_at)
SELECT 
  o.user_id,
  'sale_revenue',
  COALESCE(o.seller_commission, o.amount::numeric * 0.9101),
  COALESCE(o.currency, 'KZ'),
  'Receita de venda (valor líquido após taxa de 8.99%)',
  o.order_id,
  o.created_at
FROM orders o
WHERE o.status = 'completed'
  AND o.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM balance_transactions bt 
    WHERE bt.order_id = o.order_id 
    AND bt.user_id = o.user_id
    AND bt.type = 'sale_revenue'
  )
ON CONFLICT DO NOTHING;

-- Recalcular TODOS os saldos novamente
UPDATE customer_balances cb
SET 
  balance = COALESCE((
    SELECT SUM(CASE 
      WHEN bt.type IN ('credit', 'sale_revenue', 'affiliate_commission', 'order_bump_revenue', 'module_sale_revenue') 
      THEN bt.amount 
      ELSE -bt.amount 
    END)
    FROM balance_transactions bt
    WHERE bt.user_id = cb.user_id
  ), 0),
  updated_at = now();
