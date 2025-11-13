-- Criar sale_revenue para vendas completadas sem transação
INSERT INTO balance_transactions (
  user_id,
  type,
  amount,
  description,
  order_id,
  currency,
  created_at
)
SELECT 
  p.user_id,
  'sale_revenue' as type,
  CAST(o.seller_commission AS NUMERIC) as amount,
  'Receita de venda - ' || o.order_id as description,
  o.order_id,
  o.currency,
  o.created_at
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE p.user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  AND o.status = 'completed'
  AND NOT EXISTS(
    SELECT 1 FROM balance_transactions bt
    WHERE bt.order_id = o.order_id 
    AND bt.user_id = p.user_id
  );

-- Recalcular saldo final do Ravimo
SELECT admin_recalculate_seller_balance(
  'dd6cb74b-cb86-43f7-8386-f39b981522da'::uuid,
  false
);